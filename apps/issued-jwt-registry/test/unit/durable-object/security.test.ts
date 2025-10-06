import { env, runInDurableObject } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { I_JWT_Registry_DO } from '../../../src/index';
import type { IssuedJWTRegistry } from '@catalyst/schema_zod';

describe('Durable Object: Security Tests', () => {
	let doId: DurableObjectId;

	beforeEach(() => {
		// Use unique namespace per test for guaranteed isolation
		doId = env.ISSUED_JWT_REGISTRY_DO.idFromName(`security-${crypto.randomUUID()}`);
	});

	describe('createWithId() - System token creation bypass', () => {
		it('creates token without permission checks (intentional bypass for system tokens)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				// createWithId() should succeed without any permission checks
				const systemToken: IssuedJWTRegistry = {
					id: 'system-bypass-123',
					name: 'System Token',
					description: 'Created via createWithId bypass method',
					claims: ['system:admin'],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'system',
					status: 'active',
				};

				const result = await instance.createWithId(systemToken);

				expect(result.id).toBe('system-bypass-123');
				expect(result.organization).toBe('system');

				// Verify it was actually stored
				const stored = await state.storage.get<IssuedJWTRegistry>('system-bypass-123');
				expect(stored).toBeDefined();
				expect(stored?.name).toBe('System Token');
			});
		});

		it('allows creating tokens with predefined IDs matching JWT jti (jti-as-ID pattern)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const jti = 'abc-def-123-456'; // JWT's jti claim
				const token: IssuedJWTRegistry = {
					id: jti,
					name: 'JWT Token',
					description: 'Registry ID matches JWT jti for O(1) lookup',
					claims: ['claim1'],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'org-123',
					status: 'active',
				};

				const result = await instance.createWithId(token);

				expect(result.id).toBe(jti);

				// Critical: Verify the ID is actually the jti, not a random UUID
				const stored = await state.storage.get<IssuedJWTRegistry>(jti);
				expect(stored).toBeDefined();
				expect(stored?.id).toBe(jti);
			});
		});

		it('does not validate organization or user permissions (security boundary)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				// Should succeed even with arbitrary organization
				const arbitraryToken: IssuedJWTRegistry = {
					id: 'arbitrary-org-token',
					name: 'Arbitrary Org Token',
					description: 'No org validation',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'non-existent-org-999',
					status: 'active',
				};

				const result = await instance.createWithId(arbitraryToken);

				expect(result.organization).toBe('non-existent-org-999');
			});
		});
	});

	describe('Concurrent createWithId() calls', () => {
		it('handles concurrent calls with same ID gracefully (last write wins)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const tokenId = 'concurrent-test-id';

				const token1: IssuedJWTRegistry = {
					id: tokenId,
					name: 'First Token',
					description: 'First concurrent call',
					claims: ['claim1'],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'org-1',
					status: 'active',
				};

				const token2: IssuedJWTRegistry = {
					id: tokenId,
					name: 'Second Token',
					description: 'Second concurrent call',
					claims: ['claim2'],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'org-2',
					status: 'active',
				};

				// Execute concurrent creates
				const [result1, result2] = await Promise.all([instance.createWithId(token1), instance.createWithId(token2)]);

				// Both should succeed
				expect(result1.id).toBe(tokenId);
				expect(result2.id).toBe(tokenId);

				// One should have won (last write wins in blockConcurrencyWhile)
				const final = await state.storage.get<IssuedJWTRegistry>(tokenId);
				expect(final).toBeDefined();
				expect(['First Token', 'Second Token']).toContain(final?.name);
			});
		});

		it('handles concurrent validation requests atomically (10 parallel reads)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const token: IssuedJWTRegistry = {
					id: 'concurrent-validate',
					name: 'Concurrent Validation Token',
					description: 'Test atomic validation',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'active',
				};
				await state.storage.put(token.id, token);

				// Execute 10 concurrent validations
				const results = await Promise.all(Array.from({ length: 10 }, () => instance.validateToken('concurrent-validate')));

				// All should return the same result
				results.forEach((result) => {
					expect(result.valid).toBe(true);
					expect(result.entry?.id).toBe('concurrent-validate');
				});
			});
		});
	});

	describe('Race condition tests', () => {
		it('handles concurrent revocation and validation (eventual consistency)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const token: IssuedJWTRegistry = {
					id: 'race-revoke-validate',
					name: 'Race Condition Token',
					description: 'Test revocation race',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'active',
				};
				await state.storage.put(token.id, token);

				// Race: validation vs revocation
				const [validateResult, revokeResult] = await Promise.all([
					instance.validateToken('race-revoke-validate'),
					instance.addToRevocationList('race-revoke-validate'),
				]);

				// Either valid before revoke, or invalid after revoke
				// But both operations should complete successfully
				expect(typeof validateResult.valid).toBe('boolean');
				expect(typeof revokeResult).toBe('boolean');

				// Final state should be revoked
				const final = await state.storage.get<IssuedJWTRegistry>('race-revoke-validate');
				expect(final?.status).toBe('revoked');
			});
		});

		it('handles concurrent delete and validate (deletion wins race)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const token: IssuedJWTRegistry = {
					id: 'race-delete-validate',
					name: 'Delete Race Token',
					description: 'Test deletion race',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'active',
				};
				await state.storage.put(token.id, token);

				// Race: validation vs deletion
				const [validateResult, deleteResult] = await Promise.all([
					instance.validateToken('race-delete-validate'),
					instance.delete('race-delete-validate'),
				]);

				// Both operations should complete
				expect(typeof validateResult.valid).toBe('boolean');
				expect(typeof deleteResult).toBe('boolean');

				// Final state should be deleted
				const final = await state.storage.get<IssuedJWTRegistry>('race-delete-validate');
				expect(final?.status).toBe('deleted');
			});
		});
	});

	describe('Input validation in createWithId()', () => {
		it('accepts valid registry entries', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				const validToken: IssuedJWTRegistry = {
					id: 'valid-token-123',
					name: 'Valid Token',
					description: 'Properly formatted token',
					claims: ['claim1', 'claim2'],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'active',
				};

				const result = await instance.createWithId(validToken);

				expect(result.id).toBe('valid-token-123');
				expect(result.name).toBe('Valid Token');
			});
		});

		it('rejects entries with missing required fields', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				const invalidToken: Partial<IssuedJWTRegistry> = {
					id: 'missing-fields',
					name: 'Invalid Token',
					// Missing: description, claims, expiry, organization, status
				};

				await expect(instance.createWithId(invalidToken as IssuedJWTRegistry)).rejects.toThrow('Invalid registry entry format');
			});
		});

		it('rejects entries with invalid status values', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				const invalidToken = {
					id: 'invalid-status',
					name: 'Invalid Status Token',
					description: 'Has invalid status',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'invalid-status-value' as const, // Invalid enum value
				};

				await expect(instance.createWithId(invalidToken as IssuedJWTRegistry)).rejects.toThrow('Invalid registry entry format');
			});
		});

		it('rejects entries with invalid expiry types', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				const invalidToken = {
					id: 'invalid-expiry',
					name: 'Invalid Expiry Token',
					description: 'Has invalid expiry',
					claims: [],
					expiry: 'not-a-date' as unknown as Date, // Invalid type
					organization: 'test-org',
					status: 'active' as const,
				};

				await expect(instance.createWithId(invalidToken as IssuedJWTRegistry)).rejects.toThrow('Invalid registry entry format');
			});
		});

		it('rejects entries with invalid claims array', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
				const invalidToken = {
					id: 'invalid-claims',
					name: 'Invalid Claims Token',
					description: 'Has invalid claims',
					claims: 'not-an-array' as unknown as string[], // Invalid type
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'active' as const,
				};

				await expect(instance.createWithId(invalidToken as IssuedJWTRegistry)).rejects.toThrow('Invalid registry entry format');
			});
		});
	});

	describe('Security boundary tests', () => {
		it('prevents status escalation after deletion (no resurrection allowed)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const token: IssuedJWTRegistry = {
					id: 'no-escalation',
					name: 'No Escalation Token',
					description: 'Cannot be reactivated after deletion',
					claims: [],
					expiry: new Date(Date.now() + 1000 * 60 * 60),
					organization: 'test-org',
					status: 'deleted',
				};
				await state.storage.put(token.id, token);

				// Try to reactivate - should fail
				const result = await instance.changeStatus('no-escalation', 'active');

				expect(result).toBe(false);
				const unchanged = await state.storage.get<IssuedJWTRegistry>('no-escalation');
				expect(unchanged?.status).toBe('deleted');
			});
		});

		it('ensures expired tokens cannot be modified (immutability enforcement)', async () => {
			const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

			await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
				const token: IssuedJWTRegistry = {
					id: 'expired-immutable',
					name: 'Expired Immutable',
					description: 'Expired tokens are immutable',
					claims: [],
					expiry: new Date(Date.now() - 1000 * 60 * 60), // Expired
					organization: 'test-org',
					status: 'active',
				};
				await state.storage.put(token.id, token);

				// Try various status changes - all should fail
				const [revokeResult, deleteResult] = await Promise.all([
					instance.changeStatus('expired-immutable', 'revoked'),
					instance.changeStatus('expired-immutable', 'deleted'),
				]);

				expect(revokeResult).toBe(false);
				expect(deleteResult).toBe(false);

				const unchanged = await state.storage.get<IssuedJWTRegistry>('expired-immutable');
				expect(unchanged?.status).toBe('active'); // Unchanged
			});
		});
	});
});
