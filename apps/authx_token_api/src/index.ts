import { WorkerEntrypoint } from 'cloudflare:workers';
import {
	DataChannel,
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

export default class JWTWorker extends WorkerEntrypoint<Env> {
	async getPublicKey(keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return await stub.getPublicKey();
	}

	async getPublicKeyJWK(keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return await stub.getJWKS();
	}

	// rotate requires a token to ensure this is only done by platform admins
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

	// ensure all claims in the request are valid before signing
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
			console.log(userParse.error);
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
			console.log('user is not authorized for all claims');
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
	 * Sign a single use JWT for a data channel
	 * @param jwtRequest
	 * @param expiresIn
	 * @param token
	 * @param keyNamespace
	 * @returns
	 */
	async signSingleUseJWT(claim: string, token: Token, keyNamespace: string = 'default'): Promise<JWTSigningResponse> {
		if (!token.catalystToken) {
			console.error('need a catalyst token to sign a JWT');
			return JWTSigningResponse.parse({
				success: false,
				error: 'catalyst did not recieve a catalyst token',
			});
		}
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);

		// decode the CT token
		const decodedToken: { success: boolean; payload: JWTPayload } = await stub.decodeToken(token.catalystToken);
		if (!decodedToken?.payload || !decodedToken.payload.claims) {
			return JWTSigningResponse.parse({
				success: false,
				error: 'error decoding catalyst token',
			});
		}

		const claims = decodedToken.payload.claims;
		// @ts-expect-error: claims is not typed, but exists in the JWT payload
		if (claims?.length === 0) {
			return JWTSigningResponse.parse({
				success: false,
				error: 'invalid claims error: JWT creating request must contain at least one claim',
			});
		}

		// TODO: check  against the data channel registrar??? Ask team,
		// Note: introduces new dependency on AUTH TOKEN API, removes it from the data channel gateway tho

		// data channels that this Catalyst Token Has Access to
		const validDataChannels = await this.env.DATA_CHANNEL_REGISTRAR.list(keyNamespace, token);

		if (!validDataChannels.success) {
			console.error(validDataChannels.error);
			// return a vague error message for security purposes
			return { success: false, error: 'no resources found' };
		}

		// data channels that this Catalyst Token Has Access to
		const readableDataChannels = DataChannel.safeParse(validDataChannels.data).success
			? [DataChannel.parse(validDataChannels.data)]
			: DataChannel.array().parse(validDataChannels.data);

		const dataChannel = readableDataChannels.find((dataChannel) => dataChannel.id === claim);

		if (!dataChannel) {
			return JWTSigningResponse.parse({
				success: false,
				error: 'no resources found',
			});
		}

		// create a single use JWT for this specific data channel
		const singleUseJWTs = await stub.signJWT(
			{
				entity: decodedToken.payload.sub!,
				claims: [dataChannel.id],
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

	async validateToken(token: string, keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return await stub.validateToken(token);
	}
}
