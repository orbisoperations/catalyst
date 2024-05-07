import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import { IssuedJWTRegistry, Token, User, UserCheckActionResponse } from '@catalyst/schema_zod';
import UserCredsCacheWorker from '../../user_credentials_cache/src';
import { Logger } from 'tslog';

const logger = new Logger({});

export type Env = {
	ISSUED_JWT_REGISTRY_DO: DurableObjectNamespace<I_JWT_Registry_DO>;
	USERCACHE: Service<UserCredsCacheWorker>;
};

export default class IssuedJWTRegistryWorker extends WorkerEntrypoint<Env> {
	async RPerms(token: Token) {
		if (token.cfToken) {
			const user: User | undefined = await this.env.USERCACHE.getUser(token.cfToken);
			const parsedUser = User.safeParse(user);

			if (parsedUser.success) {
				return UserCheckActionResponse.parse({
					success: true,
					data: parsedUser.data,
				});
			}
		}
		return UserCheckActionResponse.parse({
			success: false,
			error: 'catalyst unable to validate user token',
		});
	}

	async create(
		token: Token,
		issuedJWTRegistry: Omit<IssuedJWTRegistry, 'id'>,
		doNamespace: string = 'default',
	): Promise<IssuedJWTRegistry> {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return stub.create(issuedJWTRegistry);
	}
	async get(token: Token, issuedJWTRegId: string, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return stub.get(issuedJWTRegId);
	}

	async list(token: Token, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		const list = await stub.list(permCheck.data.orgId);
		console.log({ list });
		return list;
	}

	async update(token: Token, issuedJWTRegistry: IssuedJWTRegistry, doNamespace: string = 'default'): Promise<IssuedJWTRegistry> {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return stub.update(issuedJWTRegistry);
	}

	async delete(token: Token, issuedJWTRegId: string, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return stub.delete(issuedJWTRegId);
	}
}

/** A Durable Object's behavior is defined in an exported Javascript class */
export class I_JWT_Registry_DO extends DurableObject {
	async create(issuedJWTRegistry: Omit<IssuedJWTRegistry, 'id'>) {
		const newIJR = Object.assign(issuedJWTRegistry, { id: crypto.randomUUID() });
		await this.ctx.blockConcurrencyWhile(async () => {
			await this.ctx.storage.put(newIJR.id, newIJR);
		});
		return newIJR;
	}

	async get(issuedJWTRegId: string) {
		return await this.ctx.storage.get<IssuedJWTRegistry>(issuedJWTRegId);
	}

	async list(orgId: string) {
		const allIJR = await this.ctx.storage.list<IssuedJWTRegistry>();
		return Array.from(allIJR.entries())
			.filter(([_, ijr]) => ijr.organization === orgId)
			.map(([_, ijr]) => ijr);
	}

	async update(issuedJWTRegistry: IssuedJWTRegistry) {
		await this.ctx.blockConcurrencyWhile(async () => {
			await this.ctx.storage.put(issuedJWTRegistry.id, issuedJWTRegistry);
		});
		return issuedJWTRegistry;
	}

	async delete(issuedJWTRegId: string) {
		return await this.ctx.storage.delete(issuedJWTRegId);
	}
}
