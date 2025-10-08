import { env, SELF } from 'cloudflare:test';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JWTSigningRequest } from '@catalyst/schema_zod';
import { clearAllAuthzedRoles, custodianCreatesDataChannel, generateDataChannels, TEST_ORG_ID, validUsers } from '../utils/testUtils';

/**
 * Integration Tests: Key Management and Namespace Isolation
 *
 * These tests verify:
 * - Key rotation workflows (admin-only)
 * - Namespace isolation (separate keys per namespace)
 * - Cross-namespace security boundaries
 * - Public key retrieval for different namespaces
 */
describe('Integration: Key Management and Namespaces', () => {
	const CUSTODIAN_CF_TOKEN = 'cf-custodian-token';
	const CUSTODIAN_USER = validUsers[CUSTODIAN_CF_TOKEN];
	const PLATFORM_ADMIN_CF_TOKEN = 'cf-platform-admin-token';
	const ORG_ADMIN_CF_TOKEN = 'cf-org-admin-token';
	// const ORG_ADMIN_USER = validUsers[ORG_ADMIN_CF_TOKEN];
	const ORG_USER_CF_TOKEN = 'cf-user-token';
	// const ORG_USER = validUsers[ORG_USER_CF_TOKEN];

	beforeEach(async () => {
		await clearAllAuthzedRoles();
	});

	describe('Key Rotation Workflows', () => {
		it('should rotate key and invalidate old tokens', async () => {
			// ═══════════════════════════════════════════════════════════
			// COMPLETE KEY ROTATION WORKFLOW:
			// 1. Create JWT with current key
			// 2. Rotate key (admin only)
			// 3. Verify old JWT invalid with new key
			// 4. Verify new JWTs work with new key
			// ═══════════════════════════════════════════════════════════

			// STEP 1: Setup and create initial JWT
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const channel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(channel);

			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [createdChannel.id],
			};

			// Get initial public key
			const initialPublicKey = await SELF.getPublicKey();
			const initialJWK = await SELF.getPublicKeyJWK();

			// Sign JWT with initial key
			const initialSignResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(initialSignResponse.success).toBe(true);
			const oldToken = initialSignResponse.token!;

			// Verify old token is valid
			const validateBefore = await SELF.validateToken(oldToken);
			expect(validateBefore.valid).toBe(true);

			// STEP 2: Rotate key (requires platform-admin)
			const rotateResponse = await SELF.rotateKey({
				cfToken: PLATFORM_ADMIN_CF_TOKEN,
			});

			expect(rotateResponse.success).toBe(true);
			expect(rotateResponse.error).toBeUndefined();

			// STEP 3: Verify public key changed
			const newPublicKey = await SELF.getPublicKey();
			const newJWK = await SELF.getPublicKeyJWK();

			expect(newPublicKey.pem).not.toBe(initialPublicKey.pem);
			expect(newJWK.keys[0]).not.toEqual(initialJWK.keys[0]);

			// STEP 4: Verify old token is now invalid
			const validateAfter = await SELF.validateToken(oldToken);
			expect(validateAfter.valid).toBe(false);
			expect(validateAfter.error).toBeDefined();

			// STEP 5: Verify new tokens work with new key
			const newSignResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(newSignResponse.success).toBe(true);

			const validateNew = await SELF.validateToken(newSignResponse.token!);
			expect(validateNew.valid).toBe(true);
			expect(validateNew.entity).toBe(CUSTODIAN_USER.email);

			// STEP 6: Verify new token validates cryptographically with new key
			const jwks = createLocalJWKSet(newJWK);
			const { payload } = await jwtVerify(newSignResponse.token!, jwks);
			expect(payload.sub).toBe(CUSTODIAN_USER.email);
		});

		it('should only allow platform-admin to rotate keys', async () => {
			// ═══════════════════════════════════════════════════════════
			// AUTHORIZATION TEST: Only platform-admin can rotate keys
			// Data custodian, org-admin, and org-user should be denied
			// ═══════════════════════════════════════════════════════════

			const unauthorizedRoles = [
				{ token: CUSTODIAN_CF_TOKEN, role: 'data-custodian' },
				{ token: ORG_ADMIN_CF_TOKEN, role: 'org-admin' },
				{ token: ORG_USER_CF_TOKEN, role: 'org-user' },
			];

			for (const { token } of unauthorizedRoles) {
				const rotateResponse = await SELF.rotateKey({ cfToken: token });

				expect(rotateResponse.success).toBe(false);
				expect(rotateResponse.error).toBeDefined();
				expect(rotateResponse.error).toContain('does not have access jwt admin functions');
			}

			// Verify platform-admin CAN rotate
			const adminRotateResponse = await SELF.rotateKey({
				cfToken: PLATFORM_ADMIN_CF_TOKEN,
			});

			expect(adminRotateResponse.success).toBe(true);
		});

		it('should handle key rotation without active tokens', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Rotate key when no tokens have been issued
			// Should succeed and new key should be ready for use
			// ═══════════════════════════════════════════════════════════

			const initialPublicKey = await SELF.getPublicKey();

			// Rotate without any issued tokens
			const rotateResponse = await SELF.rotateKey({
				cfToken: PLATFORM_ADMIN_CF_TOKEN,
			});

			expect(rotateResponse.success).toBe(true);

			const newPublicKey = await SELF.getPublicKey();
			expect(newPublicKey.pem).not.toBe(initialPublicKey.pem);

			// Verify new key works for signing
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const channel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(channel);

			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [createdChannel.id],
			};

			const signResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(signResponse.success).toBe(true);

			// Validate with new key
			const validateResponse = await SELF.validateToken(signResponse.token!);
			expect(validateResponse.valid).toBe(true);
		});
	});

	describe('Namespace Isolation', () => {
		it('should maintain separate keys per namespace', async () => {
			// ═══════════════════════════════════════════════════════════
			// MULTI-TENANCY TEST: Verify different namespaces have
			// completely separate keys
			// ═══════════════════════════════════════════════════════════

			// Get public keys for different namespaces
			const defaultKey = await SELF.getPublicKey('default');
			const customKey1 = await SELF.getPublicKey('tenant-1');
			const customKey2 = await SELF.getPublicKey('tenant-2');

			// All keys should be different
			expect(defaultKey.pem).not.toBe(customKey1.pem);
			expect(defaultKey.pem).not.toBe(customKey2.pem);
			expect(customKey1.pem).not.toBe(customKey2.pem);

			// Get JWK sets for different namespaces
			const defaultJWK = await SELF.getPublicKeyJWK('default');
			const custom1JWK = await SELF.getPublicKeyJWK('tenant-1');
			const custom2JWK = await SELF.getPublicKeyJWK('tenant-2');

			// Verify keys are different
			expect(defaultJWK.keys[0]).not.toEqual(custom1JWK.keys[0]);
			expect(defaultJWK.keys[0]).not.toEqual(custom2JWK.keys[0]);
			expect(custom1JWK.keys[0]).not.toEqual(custom2JWK.keys[0]);
		});

		it('should not allow cross-namespace token validation', async () => {
			// ═══════════════════════════════════════════════════════════
			// SECURITY BOUNDARY TEST: Token signed in one namespace
			// cannot be validated in another namespace
			// ═══════════════════════════════════════════════════════════

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const channel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(channel);

			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [createdChannel.id],
			};

			// Sign JWT in 'default' namespace
			const signResponse = await SELF.signJWT(
				jwtRequest,
				3600 * 1000,
				{
					cfToken: CUSTODIAN_CF_TOKEN,
				},
				'default',
			);

			expect(signResponse.success).toBe(true);
			const token = signResponse.token!;

			// Validate in 'default' namespace - should succeed
			const validateInSameNamespace = await SELF.validateToken(token, 'default');
			expect(validateInSameNamespace.valid).toBe(true);

			// Validate in 'tenant-1' namespace - should FAIL
			const validateInDifferentNamespace = await SELF.validateToken(token, 'tenant-1');
			expect(validateInDifferentNamespace.valid).toBe(false);
			expect(validateInDifferentNamespace.error).toBeDefined();
		});

		it('should handle namespace-specific key rotation', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Rotating key in one namespace should NOT
			// affect keys in other namespaces
			// ═══════════════════════════════════════════════════════════

			// Get initial keys for multiple namespaces
			const defaultKeyBefore = await SELF.getPublicKey('default');
			const tenant1KeyBefore = await SELF.getPublicKey('tenant-1');

			// Rotate key only in 'default' namespace
			const rotateResponse = await SELF.rotateKey(
				{
					cfToken: PLATFORM_ADMIN_CF_TOKEN,
				},
				'default',
			);

			expect(rotateResponse.success).toBe(true);

			// Get keys after rotation
			const defaultKeyAfter = await SELF.getPublicKey('default');
			const tenant1KeyAfter = await SELF.getPublicKey('tenant-1');

			// Default key should have changed
			expect(defaultKeyAfter.pem).not.toBe(defaultKeyBefore.pem);

			// Tenant-1 key should be UNCHANGED
			expect(tenant1KeyAfter.pem).toBe(tenant1KeyBefore.pem);
		});

		it('should support concurrent operations across namespaces', async () => {
			// ═══════════════════════════════════════════════════════════
			// CONCURRENCY TEST: Operations in different namespaces
			// should not interfere with each other
			// ═══════════════════════════════════════════════════════════

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const channel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(channel);

			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [createdChannel.id],
			};

			// Sign JWTs concurrently in different namespaces
			const [defaultResponse, tenant1Response, tenant2Response] = await Promise.all([
				SELF.signJWT(jwtRequest, 3600 * 1000, { cfToken: CUSTODIAN_CF_TOKEN }, 'default'),
				SELF.signJWT(jwtRequest, 3600 * 1000, { cfToken: CUSTODIAN_CF_TOKEN }, 'tenant-1'),
				SELF.signJWT(jwtRequest, 3600 * 1000, { cfToken: CUSTODIAN_CF_TOKEN }, 'tenant-2'),
			]);

			// All should succeed
			expect(defaultResponse.success).toBe(true);
			expect(tenant1Response.success).toBe(true);
			expect(tenant2Response.success).toBe(true);

			// All tokens should be different
			expect(defaultResponse.token).not.toBe(tenant1Response.token);
			expect(defaultResponse.token).not.toBe(tenant2Response.token);
			expect(tenant1Response.token).not.toBe(tenant2Response.token);

			// Each token should validate in its own namespace
			const [defaultValidate, tenant1Validate, tenant2Validate] = await Promise.all([
				SELF.validateToken(defaultResponse.token!, 'default'),
				SELF.validateToken(tenant1Response.token!, 'tenant-1'),
				SELF.validateToken(tenant2Response.token!, 'tenant-2'),
			]);

			expect(defaultValidate.valid).toBe(true);
			expect(tenant1Validate.valid).toBe(true);
			expect(tenant2Validate.valid).toBe(true);
		});
	});

	describe('Public Key Retrieval', () => {
		it('should return public key in PEM format for any namespace', async () => {
			const namespaces = ['default', 'tenant-1', 'custom-namespace'];

			for (const namespace of namespaces) {
				const response = await SELF.getPublicKey(namespace);

				expect(response).toBeDefined();
				expect(response.pem).toBeDefined();
				expect(response.pem).toMatch(/^-----BEGIN PUBLIC KEY-----/);
				expect(response.pem).toMatch(/-----END PUBLIC KEY-----$/);
			}
		});

		it('should return public key as JWK set for any namespace', async () => {
			const namespaces = ['default', 'tenant-1', 'custom-namespace'];

			for (const namespace of namespaces) {
				const response = await SELF.getPublicKeyJWK(namespace);

				expect(response).toBeDefined();
				expect(response.keys).toBeDefined();
				expect(Array.isArray(response.keys)).toBe(true);
				expect(response.keys.length).toBeGreaterThan(0);

				// Verify JWK structure for EdDSA
				const key = response.keys[0];
				expect(key.kty).toBe('OKP'); // Octet Key Pair
				expect(key.crv).toBe('Ed25519'); // EdDSA curve
				expect(key.x).toBeDefined(); // Public key coordinate
			}
		});
	});
});
