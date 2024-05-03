import { DurableObjectNamespace } from '@cloudflare/workers-types';
import { JWTKeyProvider } from './durable_object_security_module';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { Env } from './env';
export { JWTKeyProvider } from './durable_object_security_module';
import { JWTSigningRequest, JWTSigningResponse, Token, User } from '../../../packages/schema_zod';
type Bindings = {
	// @ts-ignore
	KEY_PROVIDER: DurableObjectNamespace<JWTKeyProvider>;
};

export default class JWTWorker extends WorkerEntrypoint<Env> {
	async getPublicKey(keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return stub.getPublicKey();
	}

	async getPublicKeyJWK(keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return stub.getPublickKeyJWK();
	}

	// rotate requires a token to ensure this is only done by platform admins
	async rotateKey(keyNamespace: string = 'default', token: Token) {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return stub.rotateKey();
	}

	// ensure all claims in the request are valid before signing
	async signJWT(jwtRequest: JWTSigningRequest, expiresIn: number, token: Token, keyNamespace: string = 'default') {
		if (!token.cfToken) {
			console.error("need a cf token to sign a JWT")
			return JWTSigningResponse.parse({
				success: false,
				error: "catalyst did not recieve a user-based token"
			})
		}

		const userParse = User.safeParse(await this.env.USERCACHE.getUser(token.cfToken))
		if (!userParse.success) {
			console.log(userParse.error)
			return JWTSigningResponse.parse({
				success: false,
				error: "catalyst is unable to verify user"
			})
		}
		const failedClaimsChecks = (await Promise.all(jwtRequest.claims.map(async (claim) => {
			return {
				claim: claim,
				check: await this.env.AUTHZED.canReadFromDataChannel(claim, userParse.data.userId)
			}
		}))).filter(check => {
			return !check.check
		})
		if (failedClaimsChecks.length > 0) {
			console.log("user is not authorized for all claims")
			return JWTSigningResponse.parse({
				success: false,
				error: "catalyst is unable to validate user to all claims"
			})
		}
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		const jwt = await stub.signJWT(jwtRequest, expiresIn);
		return JWTSigningResponse.parse({
			success: true,
			token: jwt.token
		})
	}

	async validateToken(token: string, keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return stub.validateToken(token);
	}
}
