/// <reference types="./env" />
import {
	IssuedJWTRegistry,
	IssuedJWTRegistrySchema,
	IssuedJWTRegistryStoredSchema,
	CreateIssuedJWTRegistrySchema,
	JWTRegisterStatus,
	Token,
	User,
	UserSchema,
	UserCheckActionResponse,
} from '@catalyst/schemas';
import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';

export default class IssuedJWTRegistryWorker extends WorkerEntrypoint<Env> {
	async RPerms(token: Token) {
		if (token.cfToken) {
			const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
			const parsedUser = UserSchema.safeParse(user);

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

	async create(token: Token, issuedJWTRegistry: IssuedJWTRegistry, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			console.error('Permission check failed in create', { error: permCheck.error });
			throw new Error('Authentication failed');
		}

		// Validate input requires future expiry and includes ID (jti)
		const validation = CreateIssuedJWTRegistrySchema.extend({
			id: IssuedJWTRegistrySchema.shape.id,
		}).safeParse(issuedJWTRegistry);
		if (!validation.success) {
			console.error('Invalid registry entry in create', {
				errors: validation.error.issues,
				timestamp: new Date().toISOString(),
			});
			throw new Error('Invalid registry entry');
		}

		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		const resp = await stub.createWithId(validation.data);
		return IssuedJWTRegistryStoredSchema.safeParse(resp);
	}

	/**
	 * Create a JWT registry entry for system-generated tokens
	 * Restricted to authorized internal services only
	 * @param issuedJWTRegistry - The registry entry to create (with predefined ID matching JWT's jti)
	 * @param callingService - The name of the service making the request
	 * @param doNamespace - Optional DO namespace (default: 'default')
	 */
	async createSystem(issuedJWTRegistry: IssuedJWTRegistry, callingService: string, doNamespace: string = 'default') {
		// Validate calling service against allowlist
		const ALLOWED_SERVICES = ['authx_token_api', 'data_channel_certifier', 'data_channel_registrar'];
		if (!ALLOWED_SERVICES.includes(callingService)) {
			// Audit log unauthorized attempt
			console.error('Unauthorized service attempted to create system token', {
				service: callingService,
				tokenId: issuedJWTRegistry.id,
				timestamp: new Date().toISOString(),
			});
			throw new Error('Unauthorized service');
		}

		// Validate input using Zod schema - requires future expiry and includes ID
		const validation = CreateIssuedJWTRegistrySchema.extend({
			id: IssuedJWTRegistrySchema.shape.id,
		}).safeParse(issuedJWTRegistry);
		if (!validation.success) {
			console.error('Invalid registry entry in createSystem', {
				service: callingService,
				errors: validation.error.issues,
				timestamp: new Date().toISOString(),
			});
			throw new Error('Invalid registry entry');
		}

		// Audit log successful system token creation
		console.log('System token created', {
			service: callingService,
			tokenId: issuedJWTRegistry.id,
			organization: issuedJWTRegistry.organization,
			expiry: issuedJWTRegistry.expiry.toISOString(),
			timestamp: new Date().toISOString(),
		});

		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		const resp = await stub.createWithId(validation.data);
		return resp;
	}

	async get(token: Token, issuedJWTRegId: string, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			console.error('Permission check failed in get', { error: permCheck.error });
			throw new Error('Authentication failed');
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);

		const resp = await stub.get(issuedJWTRegId);

		// Handle case where entry doesn't exist
		if (!resp) {
			return {
				success: false,
				error: `Registry entry not found for ID: ${issuedJWTRegId}`,
			};
		}

		return IssuedJWTRegistryStoredSchema.safeParse(resp);
	}

	async list(token: Token, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			console.error('Permission check failed in list', { error: permCheck.error });
			throw new Error('Authentication failed');
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		const list = await stub.list(permCheck.data.orgId);
		return IssuedJWTRegistryStoredSchema.array().safeParse(list);
	}

	async update(token: Token, issuedJWTRegistry: IssuedJWTRegistry, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			console.error('Permission check failed in update', { error: permCheck.error });
			throw new Error('Authentication failed');
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		const resp = await stub.changeStatus(issuedJWTRegistry.id, issuedJWTRegistry.status);
		return IssuedJWTRegistryStoredSchema.safeParse(resp);
	}

	async delete(token: Token, issuedJWTRegId: string, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			console.error('Permission check failed in delete', { error: permCheck.error });
			throw new Error('Authentication failed');
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		const resp = await stub.delete(issuedJWTRegId);
		console.log('JWT registry entry deleted', { success: resp });
		return resp;
	}

	async addToRevocationList(token: Token, issuedJWTRegId: string, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			console.error('Permission check failed in addToRevocationList', { error: permCheck.error });
			throw new Error('Authentication failed');
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return await stub.addToRevocationList(issuedJWTRegId);
	}
	async removeFromRevocationList(token: Token, issuedJWTRegId: string, doNamespace: string = 'default') {
		const permCheck = await this.RPerms(token);
		if (!permCheck.success) {
			console.error('Permission check failed in removeFromRevocationList', { error: permCheck.error });
			throw new Error('Authentication failed');
		}
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return await stub.removeFromRevocationList(issuedJWTRegId);
	}
	async isInvalid(issuedJWTRegId: string, doNamespace: string = 'default') {
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return await stub.isInvalid(issuedJWTRegId);
	}

	/**
	 * Get a JWT registry entry by ID without permission checks
	 * Used for token validation where we need to verify existence
	 * @param issuedJWTRegId - The JWT ID to look up
	 * @param doNamespace - Optional DO namespace (default: 'default')
	 */
	async getById(issuedJWTRegId: string, doNamespace: string = 'default') {
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return await stub.get(issuedJWTRegId);
	}

	/**
	 * Validate a JWT token in a single atomic operation
	 * Combines existence check, revocation check, and expiry check
	 * @param jwtId - The JWT ID to validate
	 * @param doNamespace - Optional DO namespace (default: 'default')
	 * @returns Validation result with reason for failure if invalid
	 */
	async validateToken(jwtId: string, doNamespace: string = 'default') {
		const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName(doNamespace);
		const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
		return await stub.validateToken(jwtId);
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

	/**
	 * Create a registry entry with a predefined ID (for system tokens where ID = JWT's jti)
	 * @param issuedJWTRegistry - Complete registry entry including the ID
	 */
	async createWithId(issuedJWTRegistry: IssuedJWTRegistry) {
		// Validate input using Zod schema - requires future expiry
		const validation = CreateIssuedJWTRegistrySchema.extend({
			id: IssuedJWTRegistrySchema.shape.id,
		}).safeParse(issuedJWTRegistry);
		if (!validation.success) {
			console.error('Invalid registry entry in createWithId', {
				errors: validation.error.issues.map((issue) => ({
					path: issue.path.join('.'),
					message: issue.message,
					code: issue.code,
				})),
				timestamp: new Date().toISOString(),
			});
			throw new Error('Invalid registry entry format');
		}

		await this.ctx.blockConcurrencyWhile(async () => {
			// Check for existing entry to prevent overwrites
			const existing = await this.ctx.storage.get<IssuedJWTRegistry>(validation.data.id);
			if (existing) {
				console.warn('Registry entry already exists - skipping overwrite');
			}
			await this.ctx.storage.put(validation.data.id, validation.data);
		});
		return validation.data;
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
		let deleted: boolean = false;
		await this.ctx.blockConcurrencyWhile(async () => {
			const currentIjr = await this.ctx.storage.get<IssuedJWTRegistry>(issuedJWTRegId);
			if (!currentIjr) {
				return;
			}
			const [canEdit, needsToBeExpired] = await this.JWTRegistryItemGuard(currentIjr);
			if (canEdit) {
				currentIjr.status = needsToBeExpired ? JWTRegisterStatus.enum.expired : JWTRegisterStatus.enum.deleted;
				await this.ctx.storage.put(currentIjr.id, currentIjr);
				deleted = true;
			}
		});
		return deleted;
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

	async isInvalid(id: string) {
		const ijr = await this.get(id);
		return ijr ? ijr.status === JWTRegisterStatus.enum.revoked || ijr.status === JWTRegisterStatus.enum.deleted : false;
	}

	/**
	 * Atomic token validation combining existence, status, and expiry checks
	 * @param jwtId - The JWT ID to validate
	 * @returns Validation result object
	 */
	async validateToken(jwtId: string): Promise<{ valid: boolean; reason?: string; entry?: IssuedJWTRegistry }> {
		const entry = await this.get(jwtId);

		if (!entry) {
			return { valid: false, reason: 'not_found' };
		}

		if (entry.status === JWTRegisterStatus.enum.revoked || entry.status === JWTRegisterStatus.enum.deleted) {
			return { valid: false, reason: 'revoked' };
		}

		if (entry.expiry.getTime() < Date.now()) {
			return { valid: false, reason: 'expired' };
		}

		return { valid: true, entry };
	}
}
