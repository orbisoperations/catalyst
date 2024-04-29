import { DurableObjectNamespace } from '@cloudflare/workers-types';
import { JWTKeyProvider } from './durable_object_security_module';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { Env } from './env';
export { JWTKeyProvider } from './durable_object_security_module';
import {  JWTSigningRequest } from '../../../packages/schema_zod';
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

	async rotateKey(keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return stub.rotateKey();
	}

	async signJWT(jwtRequest: JWTSigningRequest, expiresIn: number, keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return stub.signJWT(jwtRequest, expiresIn);
	}

	async validateToken(token: string, keyNamespace: string = 'default') {
		const id = this.env.KEY_PROVIDER.idFromName(keyNamespace);
		const stub = this.env.KEY_PROVIDER.get(id);
		return stub.validateToken(token);
	}
}
