import { WorkerEntrypoint } from 'cloudflare:workers';
import { JWTPayload } from 'jose';
import {
	DataChannel,
	DataChannelAccessToken,
	DataChannelMultiAccessResponse,
	DEFAULT_STANDARD_DURATIONS,
	JWTRotateResponse,
	Token,
	User,
} from '../../../packages/schema_zod';
import { JWTSigningRequest, JWTSigningResponse } from '../../../packages/schemas';
import { Env } from './env';
export { JWTKeyProvider } from './durable_object_security_module';

interface CatalystJWTPayload extends JWTPayload {
	claims?: string[];
}

export default class JWTWorker extends WorkerEntrypoint<Env> {
	/**
	 * Retrieves the public key for JWT verification
	 * @param keyNamespace The namespace to fetch the key from (defaults to 'default')
	 * @returns Promise containing the public key
	 */
	async getPublicKey(keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return await stub.getPublicKey();
	}

	/**
	 * Retrieves the public key in JWK (JSON Web Key) format
	 * @param keyNamespace The namespace to fetch the key from (defaults to 'default')
	 * @returns Promise containing the JWK set
	 */
	async getPublicKeyJWK(keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return await stub.getJWKS();
	}

	/**
	 * Rotates the JWT signing key
	 * Only platform administrators can perform this operation
	 * @param token The user's authentication token
	 * @param keyNamespace The namespace of the key to rotate (defaults to 'default')
	 * @returns Promise containing the rotation response
	 */
	async rotateKey(token: Token, keyNamespace: string = 'default') {
		if (!token.cfToken) {
			return JWTRotateResponse.parse({
				success: false,
				error: 'catalyst did not receive a user credential',
			});
		}
		const userResp = await this.env.USERCACHE.getUser(token.cfToken);
		if (!userResp) {
			return JWTRotateResponse.parse({
				success: false,
				error: 'catalyst did not find a user for the given credential',
			});
		}
		const userParse = User.safeParse(userResp);
		if (!userParse.success) {
			console.error(userParse.error);
			return JWTRotateResponse.parse({
				success: false,
				error: 'catalyst was not able to access user for the given credential',
			});
		}
		// add authzed here when available
		if (!userParse.data.zitadelRoles.includes('platform-admin')) {
			return JWTRotateResponse.parse({
				success: false,
				error: 'catalyst asserts user does not have access jwt admin functions',
			});
		}

		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		const success = await stub.rotateKey();

		if (success) {
			return JWTRotateResponse.parse({ success: success });
		} else {
			return JWTRotateResponse.parse({ success: success, error: 'catalyst experienced and error rotating the key' });
		}
	}

	/**
	 * Signs a JWT with provided claims after validating user permissions
	 * Ensures the user has access to all requested claims before signing
	 * @param jwtRequest Request containing entity and claims for the JWT
	 * @param expiresIn Duration in milliseconds until the token expires
	 * @param token The user's authentication token
	 * @param keyNamespace The namespace for signing keys (defaults to 'default')
	 * @returns Promise containing the signed JWT response
	 */
	async signJWT(jwtRequest: JWTSigningRequest, expiresIn: number, token: Token, keyNamespace: string = 'default') {
		if (!token.cfToken) {
			console.error('need a cf token to sign a JWT');
			return JWTSigningResponse.parse({
				success: false,
				error: 'catalyst did not recieve a user-based token',
			});
		}

		const userParse = User.safeParse(await this.env.USERCACHE.getUser(token.cfToken));
		if (!userParse.success) {
			return JWTSigningResponse.parse({
				success: false,
				error: 'catalyst is unable to verify user',
			});
		}

		if (jwtRequest.claims.length === 0) {
			return JWTSigningResponse.parse({
				success: false,
				error: 'invalid claimes error: JWT creating request must contain at least one claim',
			});
		}
		const failedClaimsChecks = (
			await Promise.all(
				jwtRequest.claims.map(async (claim) => {
					return {
						claim: claim,
						check: await this.env.AUTHZED.canReadFromDataChannel(claim, userParse.data.userId),
					};
				}),
			)
		).filter((check) => {
			return !check.check;
		});
		if (failedClaimsChecks.length > 0) {
			console.error('user is not authorized for all claims');
			return JWTSigningResponse.parse({
				success: false,
				error: 'catalyst is unable to validate user to all claims',
			});
		}
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		const jwt = await stub.signJWT(jwtRequest, expiresIn);
		// returns expiration in MS
		return JWTSigningResponse.parse({
			success: true,
			token: jwt.token,
			expiration: jwt.expiration,
		});
	}

	/**
	 * Signs a single-use JWT for a specific data channel using a catalyst token
	 * This creates a short-lived token for a single data channel access
	 * Intended for a single use token for a single data channel given a catalyst token was provided
	 * Not intended for Long Lived Tokens as can be created by users.
	 *
	 * This relies only on catalyst token token. This function assumes that the catalyst token has already been validated.
	 *
	 * @param claim The data channel claim to include in the token
	 * @param token The Token object containing the catalyst token
	 * @param keyNamespace The namespace for signing keys (defaults to 'default')
	 * @returns Promise containing the JWT signing response
	 */
	async signSingleUseJWT(claim: string, token: Token, keyNamespace: string = 'default'): Promise<JWTSigningResponse> {
		if (!token.catalystToken) {
			console.error('error signing single use JWT: did not recieve a catalyst token');
			return JWTSigningResponse.parse({
				success: false,
				error: 'catalyst did not recieve a catalyst token',
			});
		}
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);

		// decode the CT token
		const decodedToken: { success: boolean; payload: CatalystJWTPayload } = await stub.decodeToken(token.catalystToken);
		if (!decodedToken?.payload || !decodedToken.payload.claims) {
			return JWTSigningResponse.parse({
				success: false,
				error: 'error decoding catalyst token',
			});
		}

		// filter out any empty claims
		const claims: string[] = decodedToken.payload.claims?.filter((claim) => claim) ?? [];
		if (claims.length === 0) {
			return JWTSigningResponse.parse({
				success: false,
				error: 'invalid claims error: JWT creating request must contain at least one claim',
			});
		}

		// create a single use JWT for this specific data channel
		const singleUseJWTs = await stub.signJWT(
			{
				entity: decodedToken.payload.sub!,
				claims: [claim],
				expiresIn: 5 * DEFAULT_STANDARD_DURATIONS.M,
			},
			5 * DEFAULT_STANDARD_DURATIONS.M,
		);

		return JWTSigningResponse.parse({
			success: true,
			token: singleUseJWTs.token,
			expiration: singleUseJWTs.expiration,
		});
	}

	/**
	 * Splits a catalyst token into multiple single-use tokens for individual data channels
	 * This allows for more granular access control by creating separate tokens for each claim.
	 *
	 * This function will:
	 * - Validate the catalyst token before proceeding with token splitting
	 * - Only processes data channels the token has valid claims for as specifed by DATA_CHANNEL_REGISTRAR
	 * - Creates separate single-use JWTs with shorter expiration times (5 minutes)
	 * - Continues processing remaining claims even if some fail
	 *
	 * @param catalystToken The catalyst token to split into separate tokens
	 * @param keyNamespace The namespace for signing keys (defaults to 'default')
	 * @returns Promise containing a response with access tokens for each data channel
	 */
	async splitTokenIntoSingleUseTokens(catalystToken: string, keyNamespace: string = 'default'): Promise<DataChannelMultiAccessResponse> {
		const parsedTokenResult = await this.validateToken(catalystToken, keyNamespace);
		// only propagate the error if the catalyst token is invalid
		if (!parsedTokenResult.valid) {
			return {
				success: false,
				error: parsedTokenResult.error,
			};
		}

		// Use listAll() instead of list() to avoid circular dependency
		// listAll() doesn't require token validation, which breaks the circular call to validateToken
		// Filter for enabled channels (accessSwitch === true)
		const allChannels = await this.env.DATA_CHANNEL_REGISTRAR.listAll(keyNamespace, true);
		if (!allChannels || allChannels.length === 0) {
			return { success: false, error: 'no resources found' };
		}

		// Validate the channels array
		const result = DataChannel.array().safeParse(allChannels);
		if (!result.success) {
			console.error('Failed to parse array of data channels:', result.error.format());
			return DataChannelMultiAccessResponse.parse({ success: false, error: 'internal error processing channel information' });
		}

		// NOTE: claims are channel.id
		// Filter channels by claims already extracted from the validated token
		const claims = parsedTokenResult.claims;
		const dataChannels = result.data.filter((dataChannel) => claims.includes(dataChannel.id));
		if (dataChannels.length === 0) {
			// no resources found
			return DataChannelMultiAccessResponse.parse({
				success: false,
				error: 'no resources found',
			});
		}

		const singleUseTokens: DataChannelAccessToken[] = [];
		for (const claim of parsedTokenResult.claims) {
			// Check if this claim has a corresponding channel
			const matchingChannel = dataChannels.find((dataChannel) => dataChannel.id === claim);

			if (!matchingChannel) {
				// Channel doesn't exist or is disabled - fail this claim
				singleUseTokens.push({
					success: false,
					claim: claim,
					error: 'Channel not found or not accessible',
				});
				continue;
			}

			const singleUseToken = await this.signSingleUseJWT(claim, { catalystToken }, keyNamespace);
			// fail and log the error on a per claim basis, but continue to sign other claims
			// intended for silent failing when not able to sign a single use token
			if (!singleUseToken.success) {
				singleUseTokens.push({
					success: false,
					error: singleUseToken.error,
				});
			} else {
				singleUseTokens.push({
					success: true,
					claim: claim,
					dataChannel: matchingChannel,
					singleUseToken: singleUseToken.token,
				});
			}
		}

		return {
			success: true,
			channelPermissions: singleUseTokens,
		};
	}

	/**
	 * Validates a JWT token using the key provider
	 * @param token The JWT token string to validate
	 * @param keyNamespace The namespace for verification keys (defaults to 'default')
	 * @param clockTolerance Clock tolerance for expiration validation (defaults to '5 minutes')
	 * @returns Promise containing the token validation result
	 */
	async validateToken(token: string, keyNamespace: string = 'default', clockTolerance: string = '5 minutes') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return await stub.validateToken(token, clockTolerance);
	}

	/**
	 * Signs a JWT for system services
	 * This method allows authorized system services to obtain JWTs without user tokens
	 * @param request System JWT signing request containing service identity and claims
	 * @param keyNamespace The namespace for signing keys (defaults to 'default')
	 * @returns Promise containing the signed JWT response
	 */
	async signSystemJWT(
		request: {
			callingService: string;
			channelId?: string;
			channelIds?: string[];
			purpose: string;
			duration?: number; // Duration in seconds
		},
		keyNamespace: string = 'default',
	): Promise<JWTSigningResponse> {
		// Validate calling service
		// TODO: move this to a configurable list
		const ALLOWED_SYSTEM_SERVICES = ['data-channel-certifier', 'scheduled-validator'];

		if (!request.callingService || request.callingService.trim() === '') {
			return JWTSigningResponse.parse({
				success: false,
				error: 'callingService is required for system JWT signing',
			});
		}

		if (!ALLOWED_SYSTEM_SERVICES.includes(request.callingService)) {
			return JWTSigningResponse.parse({
				success: false,
				error: `Service '${request.callingService}' is not authorized for system JWT signing`,
			});
		}

		// Extract channel claims
		let claims: string[] = [];
		if (request.channelIds && request.channelIds.length > 0) {
			claims = request.channelIds;
		} else if (request.channelId) {
			claims = [request.channelId];
		}

		if (claims.length === 0) {
			return JWTSigningResponse.parse({
				success: false,
				error: 'At least one channelId is required for system JWT signing',
			});
		}

		// Validate duration (max 1 hour for system tokens)
		const duration = request.duration !== undefined ? request.duration : 300; // Default 5 minutes
		if (duration <= 0 || duration > 3600) {
			return JWTSigningResponse.parse({
				success: false,
				error: 'System JWT duration exceeds maximum allowed (3600 seconds)',
			});
		}

		// Create system JWT request
		const jwtRequest: JWTSigningRequest = {
			entity: `system-${request.callingService}`,
			claims: claims,
		};

		// Sign the JWT using the durable object
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);

		// Calculate expiry in milliseconds
		const expiresIn = duration * 1000;

		// Sign the JWT with system-specific parameters
		const jwt = await stub.signJWT(jwtRequest, expiresIn);

		// Log system token creation for audit
		console.log(`System JWT created for service: ${request.callingService}, purpose: ${request.purpose}, claims: ${claims.join(',')}`);

		// Return properly formatted response matching JWTSigningResponse schema
		return JWTSigningResponse.parse({
			success: true,
			token: jwt.token,
			expiration: jwt.expiration,
		});
	}
}
