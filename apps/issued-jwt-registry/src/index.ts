import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import { IssuedJWTRegistry } from '@catalyst/schema_zod';

export type Env = {
	IJR_DO: DurableObjectNamespace<IJ_Registry>;
}

export default class IssuedJWTRegistryWorker extends WorkerEntrypoint<Env> {
	async create(doNamespace: string, issuedJWTRegistry: Omit<IssuedJWTRegistry, "id">): Promise<IssuedJWTRegistry> {
		const doId = this.env.IJR_DO.idFromName(doNamespace)
		const stub = this.env.IJR_DO.get(doId)
		return stub.create(issuedJWTRegistry)
	}
}

/** A Durable Object's behavior is defined in an exported Javascript class */
export class IJ_Registry extends DurableObject {

	async create(issuedJWTRegistry: Omit<IssuedJWTRegistry, "id">) {
		const newIJR = Object.assign(issuedJWTRegistry, {id: crypto.randomUUID()})
		await this.ctx.blockConcurrencyWhile(async () => {
			await this.ctx.storage.put(newIJR.id, newIJR)
		})
		return newIJR;
	}

}
