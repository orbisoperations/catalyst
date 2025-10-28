import { env, runInDurableObject } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { I_JWT_Registry_DO } from '../../../src/index';
import type { IssuedJWTRegistry } from '@catalyst/schemas';

describe('Durable Object: Revocation List', () => {
	let doId: DurableObjectId;

	beforeEach(() => {
		// Use unique namespace per test for guaranteed isolation
		doId = env.ISSUED_JWT_REGISTRY_DO.idFromName(`revocation-${crypto.randomUUID()}`);
	});

	describe('addToRevocationList()', () => {
		it('adds active token to revocation list and changes status to revoked', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const entry: IssuedJWTRegistry = {
					id: 'revoke-me',
					name: 'To Be Revoked',
					description: 'Will be added to revocation list',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'active',
				};
				await state.storage.put(entry.id, entry);

				const result = await instance.addToRevocationList('revoke-me');

				expect(result).toBe(true);
				const revoked = await state.storage.get<IssuedJWTRegistry>('revoke-me');
				expect(revoked?.status).toBe('revoked');
			});
		});

		it('returns false when attempting to revoke expired token (immutability rule)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const entry: IssuedJWTRegistry = {
					id: 'expired-no-revoke',
					name: 'Expired Token',
					description: 'Already expired',
					claims: [],
					expiry: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (reliably expired)
					organization: 'test-org',
					status: 'active',
				};
				await state.storage.put(entry.id, entry);

				const result = await instance.addToRevocationList('expired-no-revoke');

				expect(result).toBe(false);
				const unchanged = await state.storage.get<IssuedJWTRegistry>('expired-no-revoke');
				expect(unchanged?.status).toBe('active'); // Not changed to revoked
			});
		});

		it('returns false when token does not exist in registry', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				const result = await instance.addToRevocationList('non-existent');

				expect(result).toBe(false);
			});
		});
	});

	describe('removeFromRevocationList()', () => {
		it('removes revoked token from list and restores to active status', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const entry: IssuedJWTRegistry = {
					id: 'un-revoke-me',
					name: 'Revoked Token',
					description: 'Will be removed from revocation list',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'revoked',
				};
				await state.storage.put(entry.id, entry);

				const result = await instance.removeFromRevocationList('un-revoke-me');

				expect(result).toBe(true);
				const active = await state.storage.get<IssuedJWTRegistry>('un-revoke-me');
				expect(active?.status).toBe('active');
			});
		});

		it('returns false when attempting to un-revoke deleted token (cannot resurrect)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const entry: IssuedJWTRegistry = {
					id: 'deleted-stay-deleted',
					name: 'Deleted Token',
					description: 'Cannot be reactivated',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'deleted',
				};
				await state.storage.put(entry.id, entry);

				const result = await instance.removeFromRevocationList('deleted-stay-deleted');

				expect(result).toBe(false);
				const unchanged = await state.storage.get<IssuedJWTRegistry>('deleted-stay-deleted');
				expect(unchanged?.status).toBe('deleted'); // Still deleted
			});
		});

		it('returns false when token does not exist in registry', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				const result = await instance.removeFromRevocationList('non-existent');

				expect(result).toBe(false);
			});
		});
	});

	describe('isInvalid()', () => {
		it('returns true for revoked token (check revocation status)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const entry: IssuedJWTRegistry = {
					id: 'revoked-invalid',
					name: 'Revoked Token',
					description: 'Should be invalid',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'revoked',
				};
				await state.storage.put(entry.id, entry);

				const result = await instance.isInvalid('revoked-invalid');

				expect(result).toBe(true);
			});
		});

		it('returns true for deleted token (also considered invalid)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const entry: IssuedJWTRegistry = {
					id: 'deleted-invalid',
					name: 'Deleted Token',
					description: 'Should be invalid',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'deleted',
				};
				await state.storage.put(entry.id, entry);

				const result = await instance.isInvalid('deleted-invalid');

				expect(result).toBe(true);
			});
		});

		it('returns false for active token (not on revocation list)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const entry: IssuedJWTRegistry = {
					id: 'active-valid',
					name: 'Active Token',
					description: 'Should be valid',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'active',
				};
				await state.storage.put(entry.id, entry);

				const result = await instance.isInvalid('active-valid');

				expect(result).toBe(false);
			});
		});

		it('returns false when token not found in registry (no revocation entry)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				const result = await instance.isInvalid('non-existent');

				expect(result).toBe(false); // Not found = not on revocation list
			});
		});
	});
});
