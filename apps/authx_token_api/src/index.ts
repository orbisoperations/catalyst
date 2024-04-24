import { DurableObjectNamespace } from '@cloudflare/workers-types';
import { HSM } from './do_hsm';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { Env } from './env';
import { JWTSigningRequest } from './jwt';
export { HSM } from './do_hsm';

type Bindings = {
	// @ts-ignore
	HSM: DurableObjectNamespace<HSM>;
};

export default class JWTWorker extends WorkerEntrypoint<Env> {
	async getPublicKey(keyNamespace: string = 'default') {
		const id = this.env.HSM.idFromName(keyNamespace);
		const stub = this.env.HSM.get(id);
		return stub.getPublicKey();
	}

	async rotateKey(keyNamespace: string = 'default') {
		const id = this.env.HSM.idFromName(keyNamespace);
		const stub = this.env.HSM.get(id);
		return stub.rotateKey();
	}

	async signJWT(jwtRequest: JWTSigningRequest, expiresIn: number, keyNamespace: string = 'default') {
		const id = this.env.HSM.idFromName(keyNamespace);
		const stub = this.env.HSM.get(id);
		return stub.signJWT(jwtRequest, expiresIn);
	}

	async validateToken(token: string, keyNamespace: string = 'default') {
		const id = this.env.HSM.idFromName(keyNamespace);
		const stub = this.env.HSM.get(id);
		return stub.validateToken(token);
	}
}
