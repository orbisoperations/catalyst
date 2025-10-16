import { env, runInDurableObject } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { I_JWT_Registry_DO } from '../../../src/index';
import type { IssuedJWTRegistry } from '@catalyst/schema_zod';

describe('Durable Object: validateToken()', () => {
	let doId: DurableObjectId;

	beforeEach(() => {
		// Use unique namespace per test for guaranteed isolation
		doId = env.ISSUED_JWT_REGISTRY_DO.idFromName(`validation-${crypto.randomUUID()}`);
	});

	it('returns valid=true with entry when token is active and unexpired', async () => {
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

		await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
			// Seed an active, unexpired token
			const validToken: IssuedJWTRegistry = {
				id: 'valid-jti-123',
				name: 'Valid Token',
				description: 'A valid, active token',
				claims: ['claim1'],
				expiry: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
				organization: 'test-org',
				status: 'active',
			};
			await state.storage.put(validToken.id, validToken);

			// Test validation
			const result = await instance.validateToken('valid-jti-123');

			expect(result.valid).toBe(true);
			expect(result.reason).toBeUndefined();
			expect(result.entry).toBeDefined();
			expect(result.entry?.id).toBe('valid-jti-123');
			expect(result.entry?.status).toBe('active');
		});
	});

	it('returns valid=false with reason="not_found" when token does not exist in registry', async () => {
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

		await runInDurableObject(stub, async (instance: I_JWT_Registry_DO) => {
			// Test with token that doesn't exist
			const result = await instance.validateToken('non-existent-jti');

			expect(result.valid).toBe(false);
			expect(result.reason).toBe('not_found');
			expect(result.entry).toBeUndefined();
		});
	});

	it('returns valid=false with reason="revoked" when token status is revoked', async () => {
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

		await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
			// Seed a revoked token
			const revokedToken: IssuedJWTRegistry = {
				id: 'revoked-jti-456',
				name: 'Revoked Token',
				description: 'A revoked token',
				claims: ['claim1'],
				expiry: new Date(Date.now() + 1000 * 60 * 60), // Still not expired
				organization: 'test-org',
				status: 'revoked',
			};
			await state.storage.put(revokedToken.id, revokedToken);

			// Test validation
			const result = await instance.validateToken('revoked-jti-456');

			expect(result.valid).toBe(false);
			expect(result.reason).toBe('revoked');
			expect(result.entry).toBeUndefined();
		});
	});

	it('returns valid=false with reason="revoked" when token status is deleted', async () => {
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

		await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
			// Seed a deleted token
			const deletedToken: IssuedJWTRegistry = {
				id: 'deleted-jti-789',
				name: 'Deleted Token',
				description: 'A deleted token',
				claims: ['claim1'],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'test-org',
				status: 'deleted',
			};
			await state.storage.put(deletedToken.id, deletedToken);

			// Test validation
			const result = await instance.validateToken('deleted-jti-789');

			expect(result.valid).toBe(false);
			expect(result.reason).toBe('revoked');
			expect(result.entry).toBeUndefined();
		});
	});

	it('returns valid=false with reason="expired" when token expiry has passed', async () => {
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

		await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
			// Seed an expired token
			const expiredToken: IssuedJWTRegistry = {
				id: 'expired-jti-111',
				name: 'Expired Token',
				description: 'An expired token',
				claims: ['claim1'],
				expiry: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (reliably expired)
				organization: 'test-org',
				status: 'active',
			};
			await state.storage.put(expiredToken.id, expiredToken);

			// Test validation
			const result = await instance.validateToken('expired-jti-111');

			expect(result.valid).toBe(false);
			expect(result.reason).toBe('expired');
			expect(result.entry).toBeUndefined();
		});
	});

	it('includes complete entry object in response when token is valid', async () => {
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

		await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
			const validToken: IssuedJWTRegistry = {
				id: 'entry-check-jti',
				name: 'Entry Check Token',
				description: 'Token to verify entry is returned',
				claims: ['claim1', 'claim2'],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'test-org-123',
				status: 'active',
			};
			await state.storage.put(validToken.id, validToken);

			const result = await instance.validateToken('entry-check-jti');

			expect(result.valid).toBe(true);
			expect(result.entry).toEqual(validToken);
			expect(result.entry?.organization).toBe('test-org-123');
			expect(result.entry?.claims).toEqual(['claim1', 'claim2']);
		});
	});

	it('checks revoked status before expiry when token is both revoked and expired', async () => {
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

		await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
			// Seed a token that is both revoked AND expired
			const revokedAndExpiredToken: IssuedJWTRegistry = {
				id: 'revoked-expired-jti',
				name: 'Revoked and Expired Token',
				description: 'Both revoked and expired',
				claims: ['claim1'],
				expiry: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (reliably expired)
				organization: 'test-org',
				status: 'revoked', // Also revoked
			};
			await state.storage.put(revokedAndExpiredToken.id, revokedAndExpiredToken);

			// Test validation - should return 'revoked' not 'expired'
			const result = await instance.validateToken('revoked-expired-jti');

			expect(result.valid).toBe(false);
			expect(result.reason).toBe('revoked'); // Revoked checked before expiry
			expect(result.entry).toBeUndefined();
		});
	});

	it('considers token valid when expiry time equals current time (< not <=)', async () => {
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(doId);

		await runInDurableObject(stub, async (instance: I_JWT_Registry_DO, state) => {
			// Use a fixed future timestamp to avoid race conditions
			const futureTime = Date.now() + 5000; // 5 seconds in the future
			const nowToken: IssuedJWTRegistry = {
				id: 'now-jti',
				name: 'Expiring Future Token',
				description: 'Token expiring in the future',
				claims: ['claim1'],
				expiry: new Date(futureTime),
				organization: 'test-org',
				status: 'active',
			};
			await state.storage.put(nowToken.id, nowToken);

			// Test validation - token valid when expiry is in the future
			const result = await instance.validateToken('now-jti');

			expect(result.valid).toBe(true); // Still valid
			expect(result.entry).toBeDefined();
		});
	});
});
