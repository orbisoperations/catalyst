/// <reference types="./env" />
import { IssuedJWTRegistry, JWTRegisterStatus, Token, User, UserCheckActionResponse, zIssuedJWTRegistry } from '@catalyst/schema_zod';
import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';

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

	async create(token: Token, issuedJWTRegistry: Omit<IssuedJWTRegistry, 'id'>, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		const resp = await stub.create(issuedJWTRegistry);
		return zIssuedJWTRegistry.safeParse(resp);
	}
	async get(token: Token, issuedJWTRegId: string, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);

		const resp = await stub.get(issuedJWTRegId);
		return zIssuedJWTRegistry.safeParse(resp);
	}

	async list(token: Token, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		const list = await stub.list(permCheck.data.orgId);
		return zIssuedJWTRegistry.array().safeParse(list);
	}

	async update(token: Token, issuedJWTRegistry: IssuedJWTRegistry, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		const resp = await stub.changeStatus(issuedJWTRegistry.id, issuedJWTRegistry.status);
		return zIssuedJWTRegistry.safeParse(resp);
	}

	async delete(token: Token, issuedJWTRegId: string, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		const resp = await stub.delete(issuedJWTRegId);
		console.log('deleted iJWTRegistry', { resp });
		return resp;
	}

	async addToRevocationList(token: Token, issuedJWTRegId: string, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return await stub.addToRevocationList(issuedJWTRegId);
	}
	async removeFromRevocationList(token: Token, issuedJWTRegId: string, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			throw new Error(permCheck.error);
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return await stub.removeFromRevocationList(issuedJWTRegId);
	}
	async isOnRevocationList(issuedJWTRegId: string, doNamespace: string = 'default') {
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return await stub.isOnRevocationList(issuedJWTRegId);
	}
}

export class I_JWT_Registry_DO extends DurableObject {
	async JWTRegistryItemGuard(ijr?: IssuedJWTRegistry) {
		const editableStatus = ijr ? ijr.status === JWTRegisterStatus.enum.active || ijr.status === JWTRegisterStatus.enum.revoked : false;
		const isExpired = ijr ? ijr.expiry.getTime() < Date.now() : false;
		return [editableStatus && !isExpired, isExpired];
	}
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
		return Array.from(allIJR.values()).filter((ijr) => ijr.organization === orgId && ijr.status !== JWTRegisterStatus.enum.deleted);
	}

	async changeStatus(issuedJWTRegId: string, status: JWTRegisterStatus) {
		let updated: boolean = false;
		await this.ctx.blockConcurrencyWhile(async () => {
			const currentIjr = await this.ctx.storage.get<IssuedJWTRegistry>(issuedJWTRegId);
			if (!currentIjr) {
				return;
			}
			const [canEdit, needsToBeExpired] = await this.JWTRegistryItemGuard(currentIjr);
			if (canEdit) {
				currentIjr.status = needsToBeExpired ? JWTRegisterStatus.enum.expired : status;
				await this.ctx.storage.put(currentIjr.id, currentIjr);
				updated = true;
			}
		});
		return updated;
	}

	async delete(issuedJWTRegId: string) {
		const currentIjr = await this.ctx.storage.get<IssuedJWTRegistry>(issuedJWTRegId);
		if (!currentIjr) return false;

		currentIjr.status = JWTRegisterStatus.enum.deleted;
		await this.ctx.storage.put(currentIjr.id, currentIjr);
		return true;
	}

	async addToRevocationList(id: string) {
		let status: boolean = false;
		await this.ctx.blockConcurrencyWhile(async () => {
			status = await this.changeStatus(id, JWTRegisterStatus.enum.revoked);
		});
		return status;
	}
	async removeFromRevocationList(id: string) {
		let status: boolean = false;
		await this.ctx.blockConcurrencyWhile(async () => {
			status = await this.changeStatus(id, JWTRegisterStatus.enum.active);
		});
		return status;
	}

	async isOnRevocationList(id: string) {
		const ijr = await this.get(id);
		return ijr ? ijr.status === JWTRegisterStatus.enum.revoked || ijr.status === JWTRegisterStatus.enum.deleted : false;
	}
}
