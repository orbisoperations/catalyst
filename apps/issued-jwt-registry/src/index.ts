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

		// Wrap the successful response
		return {
			success: true,
			data: resp,
		};
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
		return resp;
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

	/**
	 * Cron trigger handler - runs cleanup on schedule
	 *
	 *
	 * This method triggers cleanup of single-use tokens in the Durable Object
	 * to prevent memory overflow and keep storage clean.
	 */
	async scheduled(controller: ScheduledController): Promise<void> {
		console.log('[IssuedJWTRegistry] Starting scheduled cleanup run', {
			scheduledTime: controller.scheduledTime,
			cron: controller.cron,
		});

		try {
			const doId = this.env.ISSUED_JWT_REGISTRY_DO.idFromName('default');
			const stub = this.env.ISSUED_JWT_REGISTRY_DO.get(doId);
			const result = await stub.runCleanup();

			console.log('[IssuedJWTRegistry] Scheduled cleanup completed', {
				totalScanned: result.totalScanned,
				tokensDeleted: result.tokensDeleted,
				errors: result.errors.length,
			});
		} catch (error) {
			console.error('[IssuedJWTRegistry] Scheduled cleanup failed:', error);

			// Re-throw to signal failure to Cloudflare's cron system
			// This ensures the failure is visible in Workers metrics/logs
			throw error;
		}
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
		// Fetch all tokens once
		const allIJR = await this.ctx.storage.list<IssuedJWTRegistry>();

		// Return the filtered list for the requested organization
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

	/**
	 * Run cleanup of single-use tokens
	 * Called by scheduled cron trigger to prevent memory overflow
	 * Uses pagination to process tokens in batches
	 * @returns Cleanup result with counts and details
	 */
	async runCleanup() {
		// Use pagination to prevent memory overflow with large token lists
		// Process tokens in batches of 50 to stay within memory limits
		const BATCH_SIZE = 50;
		const MAX_ITERATIONS = 10; // Safety limit to prevent infinite loops
		const result = {
			totalScanned: 0,
			tokensDeleted: 0,
			errors: [] as string[],
			deletedTokenIds: [] as string[],
		};

		let lastKey: string | undefined = undefined;
		let hasMore = true;
		let iterations = 0;

		while (hasMore && iterations < MAX_ITERATIONS) {
			iterations++;

			// Fetch a batch of tokens
			const batch = await this.ctx.storage.list<IssuedJWTRegistry>({
				limit: BATCH_SIZE,
				startAfter: lastKey,
			});

			// Process cleanup on this batch
			const batchResult = await this.cleanupSingleUseTokens(batch);
			result.totalScanned += batchResult.totalScanned;
			result.tokensDeleted += batchResult.tokensDeleted;
			result.errors.push(...batchResult.errors);
			result.deletedTokenIds.push(...batchResult.deletedTokenIds);

			// Update lastKey for next iteration
			if (batch.size > 0) {
				const keys: string[] = Array.from(batch.keys());
				lastKey = keys[keys.length - 1];
			}

			// Check if there are more tokens to process
			hasMore = batch.size === BATCH_SIZE;
		}

		if (iterations >= MAX_ITERATIONS && hasMore) {
			console.error(`Cleanup pagination exceeded max iterations (${MAX_ITERATIONS})`, {
				totalScanned: result.totalScanned,
				tokensDeleted: result.tokensDeleted,
				lastKey,
			});
		}

		return result;
	}

	/**
	 * Clean up single-use tokens that were mistakenly registered
	 * Only deletes tokens with description starting with "Single-use token for data channel" or tokens with no claims
	 * @param allTokens - Map of all tokens from ctx.storage.list
	 * @returns Cleanup result with counts and details
	 */
	async cleanupSingleUseTokens(allTokens: Map<string, IssuedJWTRegistry>) {
		const result = {
			totalScanned: 0,
			tokensDeleted: 0,
			errors: [] as string[],
			deletedTokenIds: [] as string[],
		};

		for (const [id, token] of allTokens.entries()) {
			result.totalScanned++;

			const shouldDelete = token.description?.startsWith('Single-use token for data channel') || !token.claims || token.claims.length === 0;

			if (shouldDelete) {
				try {
					// Block concurrency while deleting each token
					await this.ctx.blockConcurrencyWhile(async () => {
						await this.ctx.storage.delete(id);
					});
					result.deletedTokenIds.push(id);
					result.tokensDeleted++;
				} catch (error) {
					const errorMessage = `Failed to delete token ${id}: ${error instanceof Error ? error.message : String(error)}`;
					console.error(errorMessage);
					result.errors.push(errorMessage);
				}
			}
		}

		console.log('Single-use token cleanup completed', {
			totalScanned: result.totalScanned,
			tokensDeleted: result.tokensDeleted,
		});

		return result;
	}
}
