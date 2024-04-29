import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import { IssuedJWTRegistry } from '@catalyst/schema_zod';
import { Logger } from 'tslog';

const logger = new Logger({});

export type Env =  {
	ISSUED_JWT_REGISTRY_DO: DurableObjectNamespace<I_JWT_Registry_DO>;
}

export default class IssuedJWTRegistryWorker extends WorkerEntrypoint<Env> {

	async create(doNamespace: string, issuedJWTRegistry: Omit<IssuedJWTRegistry, "id">): Promise<IssuedJWTRegistry> {
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace)
		const stub =  this.env.ISSUED_JWT_REGISTRY_DO.get(doId)
		return stub.create(issuedJWTRegistry);
	}
	async get(doNamespace: string, issuedJWTRegId: string) {
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace)
		const stub =  this.env.ISSUED_JWT_REGISTRY_DO.get(doId)
		return stub.get(issuedJWTRegId);
	}

	async list(doNamespace: string) {
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace)
		const stub =  this.env.ISSUED_JWT_REGISTRY_DO.get(doId)
		return stub.list();
	}

	async update(doNamespace: string, issuedJWTRegistry: IssuedJWTRegistry): Promise<IssuedJWTRegistry> {
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace)
		const stub =  this.env.ISSUED_JWT_REGISTRY_DO.get(doId)
		return stub.update(issuedJWTRegistry);
	}

	async delete(doNamespace: string, issuedJWTRegId: string) {
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace)
		const stub =  this.env.ISSUED_JWT_REGISTRY_DO.get(doId)
		return stub.delete(issuedJWTRegId);
	}
}

/** A Durable Object's behavior is defined in an exported Javascript class */
export class I_JWT_Registry_DO extends DurableObject {

	async create(issuedJWTRegistry: Omit<IssuedJWTRegistry, "id">) {
		const newIJR = Object.assign(issuedJWTRegistry, { id: crypto.randomUUID() })
		 await this.ctx.blockConcurrencyWhile(async () => {
			   await this.ctx.storage.put(newIJR.id, newIJR)
		 })
		return newIJR;
	}

async get(issuedJWTRegId: string) {
	return await this.ctx.storage.get<IssuedJWTRegistry>(issuedJWTRegId);
}

async list() {
		const allIJR = await this.ctx.storage.list<IssuedJWTRegistry>()
		return Array.from(allIJR.entries())
	}

	async update(issuedJWTRegistry: IssuedJWTRegistry) {
		await this.ctx.blockConcurrencyWhile(async () => {
			await this.ctx.storage.put(issuedJWTRegistry.id, issuedJWTRegistry)
		})
		return issuedJWTRegistry;
	}

	async delete(issuedJWTRegId: string) {
		return await this.ctx.storage.delete(issuedJWTRegId);
	}

}
