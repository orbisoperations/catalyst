import { env, runInDurableObject } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { I_JWT_Registry_DO } from '../../../src/index';
import type { IssuedJWTRegistry } from '@catalyst/schema_zod';

describe('Durable Object: Storage Operations', () => {
	let doId: DurableObjectId;

	beforeEach(() => {
		// Use unique namespace per test for guaranteed isolation
		doId = env.ISSUED_JWT_REGISTRY_DO.idFromName(`storage-${crypto.randomUUID()}`);
	});

	describe('createWithId()', () => {
		it('stores entry using exact ID provided (for jti-as-ID pattern)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const entry: IssuedJWTRegistry = {
					id: 'predefined-jti-123',
					name: 'Predefined ID Token',
					description: 'Token with predefined ID matching JWT jti',
					claims: ['claim1'],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'org-123',
					status: 'active',
				};

				const result = await instance.createWithId(entry);

				expect(result.id).toBe('predefined-jti-123');
				expect(result.name).toBe('Predefined ID Token');

				// Verify it's actually in storage
				const stored = await state.storage.get<IssuedJWTRegistry>('predefined-jti-123');
				expect(stored).toBeDefined();
				expect(stored?.id).toBe('predefined-jti-123');
			});
		});

		it('overwrites existing entry when duplicate ID is provided (last write wins)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const entry1: IssuedJWTRegistry = {
					id: 'duplicate-jti',
					name: 'First Entry',
					description: 'First entry with this ID',
					claims: ['claim1'],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'org-123',
					status: 'active',
				};

				const entry2: IssuedJWTRegistry = {
					id: 'duplicate-jti',
					name: 'Second Entry',
					description: 'Duplicate ID - should overwrite',
					claims: ['claim2'],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'org-456',
					status: 'active',
				};

				// Create first entry
				await instance.createWithId(entry1);

				// Create second entry with same ID - should warn but succeed
				const result = await instance.createWithId(entry2);

				expect(result.id).toBe('duplicate-jti');
				expect(result.name).toBe('Second Entry');

				// Verify the second entry overwrote the first
				const stored = await state.storage.get<IssuedJWTRegistry>('duplicate-jti');
				expect(stored?.name).toBe('Second Entry');
				expect(stored?.organization).toBe('org-456');
			});
		});
	});

	describe('get()', () => {
		it('retrieves entry by ID and returns complete record with all fields', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const entry: IssuedJWTRegistry = {
					id: 'get-test-jti',
					name: 'Get Test Token',
					description: 'Token for get test',
					claims: ['claim1', 'claim2'],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'org-get',
					status: 'active',
				};
				await state.storage.put(entry.id, entry);

				const result = await instance.get('get-test-jti');

				expect(result).toBeDefined();
				expect(result?.id).toBe('get-test-jti');
				expect(result?.name).toBe('Get Test Token');
				expect(result?.claims).toEqual(['claim1', 'claim2']);
			});
		});

		it('returns undefined when ID does not exist in storage', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				const result = await instance.get('non-existent-id');

				expect(result).toBeUndefined();
			});
		});
	});

	describe('list()', () => {
		it('filters entries by organization ID and returns only matching tokens', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				// Seed multiple entries for different orgs
				const org1Entry1: IssuedJWTRegistry = {
					id: 'org1-token1',
					name: 'Org 1 Token 1',
					description: 'First token for org 1',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'org-1',
					status: 'active',
				};
				const org1Entry2: IssuedJWTRegistry = {
					id: 'org1-token2',
					name: 'Org 1 Token 2',
					description: 'Second token for org 1',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'org-1',
					status: 'active',
				};
				const org2Entry: IssuedJWTRegistry = {
					id: 'org2-token1',
					name: 'Org 2 Token',
					description: 'Token for org 2',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'org-2',
					status: 'active',
				};

				await state.storage.put(org1Entry1.id, org1Entry1);
				await state.storage.put(org1Entry2.id, org1Entry2);
				await state.storage.put(org2Entry.id, org2Entry);

				// List org-1 tokens
				const org1List = await instance.list('org-1');
				expect(org1List).toHaveLength(2);
				expect(org1List.map((e) => e.id)).toEqual(['org1-token1', 'org1-token2']);

				// List org-2 tokens
				const org2List = await instance.list('org-2');
				expect(org2List).toHaveLength(1);
				expect(org2List[0].id).toBe('org2-token1');
			});
		});

		it('excludes deleted entries from list results (soft delete behavior)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const activeEntry: IssuedJWTRegistry = {
					id: 'active-token',
					name: 'Active Token',
					description: 'An active token',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'active',
				};
				const deletedEntry: IssuedJWTRegistry = {
					id: 'deleted-token',
					name: 'Deleted Token',
					description: 'A deleted token',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'deleted',
				};

				await state.storage.put(activeEntry.id, activeEntry);
				await state.storage.put(deletedEntry.id, deletedEntry);

				const list = await instance.list('test-org');

				expect(list).toHaveLength(1);
				expect(list[0].id).toBe('active-token');
			});
		});

		it('returns empty array when organization has no tokens in registry', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				const list = await instance.list('non-existent-org');

				expect(list).toEqual([]);
			});
		});
	});

	describe('delete()', () => {
		it('marks entry as deleted (soft delete - preserves record in storage)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const entry: IssuedJWTRegistry = {
					id: 'delete-test-jti',
					name: 'To Be Deleted',
					description: 'This will be deleted',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'active',
				};
				await state.storage.put(entry.id, entry);

				const result = await instance.delete('delete-test-jti');

				expect(result).toBe(true);

				// Verify status changed to deleted
				const deleted = await state.storage.get<IssuedJWTRegistry>('delete-test-jti');
				expect(deleted?.status).toBe('deleted');
				expect(deleted?.id).toBe('delete-test-jti'); // Still in storage, just marked deleted
			});
		});

		it('returns false when attempting to delete non-existent entry', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				const result = await instance.delete('non-existent-id');

				expect(result).toBe(false);
			});
		});

		it('respects guard: cannot delete tokens with status "expired"', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const expiredEntry: IssuedJWTRegistry = {
					id: 'expired-status-token',
					name: 'Expired Token',
					description: 'Token with expired status',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60), // Future expiry, but status is expired
					organization: 'test-org',
					status: 'expired',
				};
				await state.storage.put(expiredEntry.id, expiredEntry);

				const result = await instance.delete('expired-status-token');

				expect(result).toBe(false);

				// Verify status unchanged
				const entry = await state.storage.get<IssuedJWTRegistry>('expired-status-token');
				expect(entry?.status).toBe('expired');
			});
		});

		it('respects guard: cannot delete tokens past their expiry date', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const pastExpiryEntry: IssuedJWTRegistry = {
					id: 'past-expiry-token',
					name: 'Past Expiry Token',
					description: 'Token past its expiry date',
					claims: [],
					expiry: new Date(Date.now() - 1000 * 60 * 60), // 1 hour in the past
					organization: 'test-org',
					status: 'active',
				};
				await state.storage.put(pastExpiryEntry.id, pastExpiryEntry);

				const result = await instance.delete('past-expiry-token');

				expect(result).toBe(false);

				// Verify token was marked expired instead
				const entry = await state.storage.get<IssuedJWTRegistry>('past-expiry-token');
				expect(entry?.status).toBe('active'); // Guard prevents any modification
			});
		});

		it('respects guard: cannot delete already-deleted tokens', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const deletedEntry: IssuedJWTRegistry = {
					id: 'already-deleted-token',
					name: 'Already Deleted',
					description: 'Already marked as deleted',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'deleted',
				};
				await state.storage.put(deletedEntry.id, deletedEntry);

				const result = await instance.delete('already-deleted-token');

				expect(result).toBe(false);

				// Verify status unchanged
				const entry = await state.storage.get<IssuedJWTRegistry>('already-deleted-token');
				expect(entry?.status).toBe('deleted');
			});
		});

		it('respects guard: can delete revoked tokens', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const revokedEntry: IssuedJWTRegistry = {
					id: 'revoked-token',
					name: 'Revoked Token',
					description: 'Token in revoked status',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'revoked',
				};
				await state.storage.put(revokedEntry.id, revokedEntry);

				const result = await instance.delete('revoked-token');

				expect(result).toBe(true);

				// Verify status changed to deleted
				const entry = await state.storage.get<IssuedJWTRegistry>('revoked-token');
				expect(entry?.status).toBe('deleted');
			});
		});
	});
});
