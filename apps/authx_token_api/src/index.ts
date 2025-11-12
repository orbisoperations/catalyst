import { WorkerEntrypoint } from 'cloudflare:workers';
import {
	DataChannelAccessToken,
	DataChannelMultiAccessResponse,
	DataChannelMultiAccessResponseSchema,
	DataChannelStoredSchema,
	DEFAULT_STANDARD_DURATIONS,
	JWTParsingResponseSchema,
	JWTRotateResponseSchema,
	Token,
	UserSchema,
	JWTSigningRequest,
	JWTSigningResponse,
	JWTSigningResponseSchema,
	IssuedJWTRegistry,
	JWTRegisterStatus,
	JWTAudience,
	CatalystSystemService,
} from '@catalyst/schemas';
import { Env } from './env';
import { JWT } from './jwt';
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
			return JWTRotateResponseSchema.parse({
				success: false,
				error: 'catalyst did not receive a user credential',
			});
		}
		const userResp = await this.env.USERCACHE.getUser(token.cfToken);
		if (!userResp) {
			return JWTRotateResponseSchema.parse({
				success: false,
				error: 'catalyst did not find a user for the given credential',
			});
		}
		const userParse = UserSchema.safeParse(userResp);
		if (!userParse.success) {
			console.error(userParse.error);
			return JWTRotateResponseSchema.parse({
				success: false,
				error: 'catalyst was not able to access user for the given credential',
			});
		}
		// add authzed here when available
		if (!userParse.data.zitadelRoles.includes('platform-admin')) {
			return JWTRotateResponseSchema.parse({
				success: false,
				error: 'catalyst asserts user does not have access jwt admin functions',
			});
		}

		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		const success = await stub.rotateKey();

		if (success) {
			return JWTRotateResponseSchema.parse({ success: success });
		} else {
			return JWTRotateResponseSchema.parse({ success: success, error: 'catalyst experienced and error rotating the key' });
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
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'catalyst did not recieve a user-based token',
			});
		}

		const userParse = UserSchema.safeParse(await this.env.USERCACHE.getUser(token.cfToken));
		if (!userParse.success) {
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'catalyst is unable to verify user',
			});
		}

		if (jwtRequest.claims.length === 0) {
			return JWTSigningResponseSchema.parse({
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
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'catalyst is unable to validate user to all claims',
			});
		}
		console.log(jwtRequest);
		// Create the JWT object first to get the JTI
		// Use provided audience or default to 'catalyst:gateway' for user-signed JWTs
		const audience = jwtRequest.audience || JWTAudience.enum['catalyst:gateway'];
		const jwt = new JWT(jwtRequest.entity, jwtRequest.claims, 'catalyst:system:jwt:latest', audience);

		try {
			// Sign the JWT first to get the exact expiry timestamp
			const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
			const stub = this.env.KEY_PROVIDER.get(id);
			// Pass the jti along with the request data
			const signedJwt = await stub.signJWT(
				{
					entity: jwtRequest.entity,
					claims: jwtRequest.claims,
					audience: audience, // Use the resolved audience
					jti: jwt.jti, // Pass the jti we generated
				},
				expiresIn,
			);

			// Register the token AFTER signing with the actual expiry
			// Use signedJwt.expiration which is the exact timestamp from the JWT
			// Use user-provided metadata if available (and not empty), otherwise use defaults
			// Extract email from entity (format: "org/email" or just "email")
			const entity = jwtRequest.entity;
			const emailForDisplay = entity.includes('/') ? entity.split('/')[1] : entity;

			const registryEntry: IssuedJWTRegistry = {
				id: jwt.jti, // Critical: Use JWT's jti as the registry ID
				name: (jwtRequest.name && jwtRequest.name.trim()) || `User token for ${emailForDisplay}`,
				description:
					(jwtRequest.description && jwtRequest.description.trim()) || `User token with ${jwtRequest.claims.length} data channel claims`,
				claims: jwt.claims,
				expiry: new Date(signedJwt.expiration), // Use actual JWT expiry
				organization: userParse.data.orgId,
				status: JWTRegisterStatus.enum.active,
			};
			console.log('RegistryEntry:', registryEntry);
			// Register after signing (still atomic - if registration fails, we don't return the token)
			await this.env.ISSUED_JWT_REGISTRY.createSystem(registryEntry, 'authx_token_api', keyNamespace);

			// returns expiration in MS
			return JWTSigningResponseSchema.parse({
				success: true,
				token: signedJwt.token,
				expiration: signedJwt.expiration,
			});
		} catch (error) {
			console.error('Failed to sign or register JWT:', error);
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'Failed to create token: signing or registration failed',
			});
		}
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
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'catalyst did not recieve a catalyst token',
			});
		}
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);

		// decode the CT token
		const decodedToken: { success: boolean; payload: CatalystJWTPayload } = await stub.decodeToken(token.catalystToken);
		if (!decodedToken?.payload || !decodedToken.payload.claims) {
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'error decoding catalyst token',
			});
		}

		// filter out any empty claims
		const claims: string[] = decodedToken.payload.claims?.filter((claim) => claim) ?? [];
		if (claims.length === 0) {
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'invalid claims error: JWT creating request must contain at least one claim',
			});
		}

		// Check that the requested claim is in the catalyst token's claims
		if (!claims.includes(claim)) {
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'Requested claim not found in catalyst token',
			});
		}

		// Create the JWT object first to get the JTI
		const jwt = new JWT(decodedToken.payload.sub!, [claim], 'catalyst:system:jwt:latest', JWTAudience.enum['catalyst:datachannel']);

		const expiresIn = 5 * DEFAULT_STANDARD_DURATIONS.M; // 5 minutes

		try {
			// Sign the JWT first to get the exact expiry timestamp
			// Pass the jti along with the request data
			const signedJwt = await stub.signJWT(
				{
					entity: decodedToken.payload.sub!,
					claims: [claim],
					audience: JWTAudience.enum['catalyst:datachannel'],
					jti: jwt.jti, // Pass the jti we generated
				},
				expiresIn,
			);

			return JWTSigningResponseSchema.parse({
				success: true,
				token: signedJwt.token,
				expiration: signedJwt.expiration,
			});
		} catch (error) {
			console.error('Failed to sign single-use JWT:', error);
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'Failed to create single-use token: signing failed',
			});
		}
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

		// Validate the channels array using stored schema (lenient for old data)
		const result = DataChannelStoredSchema.array().safeParse(allChannels);
		if (!result.success) {
			console.error('[splitTokenIntoSingleUseTokens] Failed to parse array of data channels');
			console.error('[splitTokenIntoSingleUseTokens] Validation errors:', JSON.stringify(result.error.format(), null, 2));
			console.error('[splitTokenIntoSingleUseTokens] Raw channel data:', JSON.stringify(allChannels, null, 2));

			// Try parsing each channel individually to identify which one(s) fail
			allChannels.forEach((ch, idx: number) => {
				const singleResult = DataChannelStoredSchema.safeParse(ch);
				if (!singleResult.success) {
					console.error(`[splitTokenIntoSingleUseTokens] Channel ${idx} (${ch.id}) failed validation:`, {
						channel: ch,
						errors: singleResult.error.format(),
					});
				}
			});

			return DataChannelMultiAccessResponseSchema.parse({ success: false, error: 'internal error processing channel information' });
		}

		console.log('[splitTokenIntoSingleUseTokens] Successfully parsed channels:', result.data.length);

		// NOTE: claims are channel.id
		// Filter channels by claims already extracted from the validated token
		const claims = parsedTokenResult.claims;
		const dataChannels = result.data.filter((dataChannel) => claims.includes(dataChannel.id));
		if (dataChannels.length === 0) {
			// no resources found
			return DataChannelMultiAccessResponseSchema.parse({
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
					claim: claim,
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
	 * Also checks if the token is registered and not revoked/deleted
	 * @param token The JWT token string to validate
	 * @param keyNamespace The namespace for verification keys (defaults to 'default')
	 * @param clockTolerance Clock tolerance for expiration validation (defaults to '5 minutes')
	 * @returns Promise containing the token validation result
	 */
	async validateToken(token: string, keyNamespace: string = 'default', clockTolerance: string = '5 minutes') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);

		// First perform cryptographic validation
		const validationResult = await stub.validateToken(token, clockTolerance);

		// If cryptographic validation fails, return immediately
		if (!validationResult.valid) {
			return validationResult;
		}

		// If no jti, can't check registry - return validation result as-is
		if (!validationResult.jwtId) {
			return validationResult;
		}

		// Tokens with catalyst:datachannel audience are ephemeral and not registered
		// This includes both single-use tokens and data-channel-certifier system tokens
		// They rely solely on cryptographic validation (signature, expiry, audience)
		// This prevents storage bloat from short-lived tokens that are created frequently
		if (validationResult.audience === 'catalyst:datachannel') {
			return validationResult;
		}

		// Check registry status for gateway tokens (Deleted tokens MUST fail authentication)
		try {
			// Use validateToken method which performs atomic validation
			const registryValidation = await this.env.ISSUED_JWT_REGISTRY.validateToken(validationResult.jwtId, keyNamespace);

			if (!registryValidation.valid) {
				// Token is either not found, revoked, deleted, or expired in registry
				return JWTParsingResponseSchema.parse({
					valid: false,
					entity: undefined,
					claims: [],
					error: `Token invalid in registry: ${registryValidation.reason || 'unknown'}`,
				});
			}

			// Token is valid both cryptographically and in the registry
			return validationResult;
		} catch (error) {
			console.error('Failed to check registry status during token validation:', error);
			// On registry check failure, fail closed (deny access)
			return JWTParsingResponseSchema.parse({
				valid: false,
				entity: undefined,
				claims: [],
				error: 'Failed to verify token registry status',
			});
		}
	}

	/**
	 * Signs a JWT for system services
	 * This method allows authorized system services to obtain JWTs without user tokens
	 *
	 * Allowed services defined in ALLOWED_SYSTEM_SERVICES constant
	 *
	 * Ephemeral services defined in EPHEMERAL_SERVICES constant. These services are short-lived and not registered in the
	 * issued-jwt-registry.
	 *
	 * @param request System JWT signing request containing service identity and claims
	 * @param keyNamespace The namespace for signing keys (defaults to 'default')
	 * @returns Promise containing the signed JWT response
	 */
	async signSystemJWT(
		request: {
			callingService: CatalystSystemService;
			channelId?: string;
			channelIds?: string[];
			purpose: string;
			duration?: number; // Duration in seconds
		},
		keyNamespace: string = 'default',
	): Promise<JWTSigningResponse> {
		// Validate calling service
		// TODO: move this to a configurable list
		const ALLOWED_SYSTEM_SERVICES: CatalystSystemService[] = ['data-channel-certifier', 'scheduled-validator', 'gateway-single-use-token'];

		if (!request.callingService || request.callingService.trim() === '') {
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'callingService is required for system JWT signing',
			});
		}

		if (!ALLOWED_SYSTEM_SERVICES.includes(request.callingService)) {
			return JWTSigningResponseSchema.parse({
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
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'At least one channelId is required for system JWT signing',
			});
		}

		// Validate duration (max 1 hour for system tokens)
		const duration = request.duration !== undefined ? request.duration : 300; // Default 5 minutes
		if (duration <= 0 || duration > 3600) {
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'System JWT duration exceeds maximum allowed (3600 seconds)',
			});
		}

		// Calculate expiry in milliseconds
		const expiresIn = duration * 1000;

		// Create the JWT object first to get the JTI
		const jwt = new JWT(`system-${request.callingService}`, claims, 'catalyst:system:jwt:latest', JWTAudience.enum['catalyst:datachannel']);

		try {
			// Sign the JWT first to get the exact expiry timestamp
			const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
			const stub = this.env.KEY_PROVIDER.get(id);
			// Pass the jti along with the request data
			const signedJwt = await stub.signJWT(
				{
					entity: `system-${request.callingService}`,
					claims: claims,
					audience: JWTAudience.enum['catalyst:datachannel'],
					jti: jwt.jti, // Pass the jti we generated
				},
				expiresIn,
			);

			// Skip registry storage for validation service tokens (ephemeral, high-frequency)
			// These tokens are short-lived (5 min) and created frequently for validation purposes
			// Both data-channel-certifier and scheduled-validator create many tokens per day
			const EPHEMERAL_SERVICES: CatalystSystemService[] = ['data-channel-certifier', 'scheduled-validator', 'gateway-single-use-token'];
			if (EPHEMERAL_SERVICES.includes(request.callingService)) {
				// Log for audit trail without storing in registry
				console.log(
					`Ephemeral system JWT created for service: ${request.callingService}, purpose: ${request.purpose}, claims: ${claims.join(',')}`,
				);

				return JWTSigningResponseSchema.parse({
					success: true,
					token: signedJwt.token,
					expiration: signedJwt.expiration,
				});
			}

			// Register other system tokens that may need revocation capability
			const registryEntry: IssuedJWTRegistry = {
				id: jwt.jti, // Critical: Use JWT's jti as the registry ID
				name: `System token for ${request.callingService}`,
				description: `System token for ${request.purpose}`,
				claims: jwt.claims,
				expiry: new Date(signedJwt.expiration), // Use actual JWT expiry
				organization: 'system',
				status: JWTRegisterStatus.enum.active,
			};

			// Register after signing (still atomic - if registration fails, we don't return the token)
			await this.env.ISSUED_JWT_REGISTRY.createSystem(registryEntry, 'authx_token_api', keyNamespace);

			// Log system token creation for audit
			console.log(`System JWT created for service: ${request.callingService}, purpose: ${request.purpose}, claims: ${claims.join(',')}`);

			// Return properly formatted response matching JWTSigningResponse schema
			return JWTSigningResponseSchema.parse({
				success: true,
				token: signedJwt.token,
				expiration: signedJwt.expiration,
			});
		} catch (error) {
			console.error('Failed to sign or register system JWT:', error);
			return JWTSigningResponseSchema.parse({
				success: false,
				error: 'Failed to create system token',
			});
		}
	}
}
