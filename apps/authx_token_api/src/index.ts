import { WorkerEntrypoint } from 'cloudflare:workers';
import {
	DataChannel,
	DataChannelAccessToken,
	DataChannelMultiAccessResponse,
	DEFAULT_STANDARD_DURATIONS,
	JWTRotateResponse,
	JWTSigningRequest,
	JWTSigningResponse,
	Token,
	User,
} from '../../../packages/schema_zod';
import { Env } from './env';
import { JWTPayload } from 'jose';
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

		// data channels that this Catalyst Token Has Access to
		const validDataChannels = await this.env.DATA_CHANNEL_REGISTRAR.list(keyNamespace, { catalystToken });
		if (!validDataChannels.success) {
			console.error(validDataChannels.error);
			// return a vague error message for security purposes
			return { success: false, error: 'no resources found' };
		}

		// map this the validDataChannels to a list of DataChannel objects and fail if
		// any of the data channels are not valid form of DataChannel
		let readableDataChannels: DataChannel[] = [];
		if (Array.isArray(validDataChannels.data)) {
			const result = DataChannel.array().safeParse(validDataChannels.data);
			if (!result.success) {
				console.error('Failed to parse array of data channels:', result.error.format());
				return DataChannelMultiAccessResponse.parse({ success: false, error: 'internal error processing channel information' });
			}
			readableDataChannels = result.data;
		} else {
			const result = DataChannel.safeParse(validDataChannels.data);
			if (!result.success) {
				console.error('Failed to parse single data channel:', result.error.format());
				return DataChannelMultiAccessResponse.parse({ success: false, error: 'internal error processing channel information' });
			}
			readableDataChannels = [result.data];
		}

		// NOTE: claims are channel.id
		// filter out readable channels that are not in the claims
		const claims = parsedTokenResult.claims;
		const dataChannels = readableDataChannels.filter((dataChannel) => claims.includes(dataChannel.id));
		if (dataChannels.length === 0) {
			// no resources found
			return DataChannelMultiAccessResponse.parse({
				success: false,
				error: 'no resources found',
			});
		}

		const singleUseTokens: DataChannelAccessToken[] = [];
		for (const claim of parsedTokenResult.claims) {
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
					dataChannel: dataChannels.find((dataChannel) => dataChannel.id === claim)!,
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
	 * @returns Promise containing the token validation result
	 */
	async validateToken(token: string, keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return await stub.validateToken(token);
	}
}
