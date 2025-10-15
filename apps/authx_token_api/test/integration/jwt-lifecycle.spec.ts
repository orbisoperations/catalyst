import { env, SELF } from 'cloudflare:test';
import { createLocalJWKSet, decodeJwt, jwtVerify } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JWTSigningRequest } from '@catalyst/schema_zod';
import { clearAllAuthzedRoles, custodianCreatesDataChannel, generateDataChannels, TEST_ORG_ID, validUsers } from '../utils/testUtils';

/**
 * Integration Tests: Complete JWT Lifecycle
 *
 * These tests verify the end-to-end journey of a JWT from creation through
 * cryptographic validation, testing real service interactions with AuthZed,
 * UserCache, and the KEY_PROVIDER Durable Object.
 */
describe('Integration: Complete JWT Lifecycle', () => {
	const CUSTODIAN_CF_TOKEN = 'cf-custodian-token';
	const CUSTODIAN_USER = validUsers[CUSTODIAN_CF_TOKEN];
	const PLATFORM_ADMIN_CF_TOKEN = 'cf-platform-admin-token';

	beforeEach(async () => {
		await clearAllAuthzedRoles();
	});

	describe('End-to-End JWT Workflows', () => {
		it('should create, validate, and cryptographically verify JWT end-to-end', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Setup - Create user permissions in AuthZed
			// ═══════════════════════════════════════════════════════════
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			// Create a data channel with proper permissions
			const dataChannel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(dataChannel);

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Sign JWT with user token
			// ═══════════════════════════════════════════════════════════
			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [createdChannel.id],
			};

			const signResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			// Verify signing succeeded
			expect(signResponse.success).toBe(true);
			expect(signResponse.token).toBeDefined();
			expect(signResponse.expiration).toBeDefined();

			const token = signResponse.token!;

			// ═══════════════════════════════════════════════════════════
			// STEP 3: Validate the signed JWT via service
			// ═══════════════════════════════════════════════════════════
			const validateResponse = await SELF.validateToken(token);

			expect(validateResponse.valid).toBe(true);
			expect(validateResponse.entity).toBe(CUSTODIAN_USER.email);
			expect(validateResponse.claims).toEqual([createdChannel.id]);
			expect(validateResponse.jwtId).toBeDefined();
			expect(validateResponse.error).toBeUndefined();

			// ═══════════════════════════════════════════════════════════
			// STEP 4: Cryptographic verification with public key
			// ═══════════════════════════════════════════════════════════
			const publicKeyResponse = await SELF.getPublicKeyJWK();
			expect(publicKeyResponse.keys).toBeDefined();
			expect(publicKeyResponse.keys.length).toBeGreaterThan(0);

			// Create JWK set for verification
			const jwks = createLocalJWKSet(publicKeyResponse);

			// Verify signature and extract payload
			const { payload, protectedHeader } = await jwtVerify(token, jwks, {
				clockTolerance: '5 minutes',
			});

			// ═══════════════════════════════════════════════════════════
			// STEP 5: Verify all JWT claims match expectations
			// ═══════════════════════════════════════════════════════════
			expect(protectedHeader.alg).toBe('EdDSA');
			expect(payload.sub).toBe(CUSTODIAN_USER.email);
			expect(payload.claims).toEqual([createdChannel.id]);
			expect(payload.aud).toBe('catalyst:gateway');
			expect(payload.iss).toBe('catalyst:system:jwt:latest');
			expect(payload.jti).toBeDefined();

			// Verify expiration timestamps
			expect(payload.exp).toBeDefined();
			expect(payload.iat).toBeDefined();
			expect(payload.nbf).toBeDefined();

			const now = Math.floor(Date.now() / 1000);
			expect(payload.iat).toBeLessThanOrEqual(now + 1); // Allow 1 second clock skew
			expect(payload.exp).toBeGreaterThan(now);
			expect(payload.nbf).toBeLessThanOrEqual(now);

			// Verify expiration is approximately 1 hour from now (3600 seconds)
			const expectedExpiry = (payload.exp as number) - (payload.iat as number);
			expect(expectedExpiry).toBeGreaterThanOrEqual(3590); // Allow 10 second tolerance
			expect(expectedExpiry).toBeLessThanOrEqual(3610);
		});

		it('should reject validation of JWT after key rotation', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Setup permissions and create initial JWT
			// ═══════════════════════════════════════════════════════════
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const dataChannel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(dataChannel);

			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [createdChannel.id],
			};

			// Sign JWT with current key
			const signResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(signResponse.success).toBe(true);
			const oldToken = signResponse.token!;

			// Verify old token is valid before rotation
			const validateBefore = await SELF.validateToken(oldToken);
			expect(validateBefore.valid).toBe(true);

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Rotate the signing key (platform admin only)
			// ═══════════════════════════════════════════════════════════
			const rotateResponse = await SELF.rotateKey({
				cfToken: PLATFORM_ADMIN_CF_TOKEN,
			});

			expect(rotateResponse.success).toBe(true);

			// ═══════════════════════════════════════════════════════════
			// STEP 3: Attempt to validate old JWT with new key
			// ═══════════════════════════════════════════════════════════
			const validateAfter = await SELF.validateToken(oldToken);

			// Old token should now fail validation
			expect(validateAfter.valid).toBe(false);
			expect(validateAfter.error).toBeDefined();
			expect(validateAfter.entity).toBeUndefined();
			expect(validateAfter.claims).toEqual([]);

			// ═══════════════════════════════════════════════════════════
			// STEP 4: Verify new tokens work with new key
			// ═══════════════════════════════════════════════════════════
			const newSignResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(newSignResponse.success).toBe(true);

			const validateNew = await SELF.validateToken(newSignResponse.token!);
			expect(validateNew.valid).toBe(true);
		});

		it('should create JWT and validate with public key JWK set', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Setup and sign JWT
			// ═══════════════════════════════════════════════════════════
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const dataChannel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(dataChannel);

			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [createdChannel.id],
			};

			const signResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(signResponse.success).toBe(true);
			const token = signResponse.token!;

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Get public key as JWK set
			// ═══════════════════════════════════════════════════════════
			const jwkResponse = await SELF.getPublicKeyJWK();

			expect(jwkResponse).toBeDefined();
			expect(jwkResponse.keys).toBeDefined();
			expect(Array.isArray(jwkResponse.keys)).toBe(true);
			expect(jwkResponse.keys.length).toBeGreaterThan(0);

			// Verify JWK structure
			const publicKey = jwkResponse.keys[0];
			expect(publicKey.kty).toBe('OKP'); // Octet Key Pair (EdDSA)
			expect(publicKey.crv).toBe('Ed25519');
			expect(publicKey.x).toBeDefined();

			// ═══════════════════════════════════════════════════════════
			// STEP 3: Verify JWT signature using JWK
			// ═══════════════════════════════════════════════════════════
			const jwks = createLocalJWKSet(jwkResponse);
			const { payload, protectedHeader } = await jwtVerify(token, jwks, {
				clockTolerance: '5 minutes',
			});

			// ═══════════════════════════════════════════════════════════
			// STEP 4: Verify payload contents
			// ═══════════════════════════════════════════════════════════
			expect(protectedHeader.alg).toBe('EdDSA');
			expect(payload.sub).toBe(CUSTODIAN_USER.email);
			expect(payload.claims).toEqual([createdChannel.id]);

			// ═══════════════════════════════════════════════════════════
			// STEP 5: Verify PEM format also works
			// ═══════════════════════════════════════════════════════════
			const pemResponse = await SELF.getPublicKey();

			expect(pemResponse).toBeDefined();
			expect(pemResponse.pem).toBeDefined();
			expect(pemResponse.pem).toMatch(/^-----BEGIN PUBLIC KEY-----/);
			expect(pemResponse.pem).toMatch(/-----END PUBLIC KEY-----$/);
		});

		it('should handle JWT expiration correctly in full workflow', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Setup permissions
			// ═══════════════════════════════════════════════════════════
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const dataChannel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(dataChannel);

			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [createdChannel.id],
			};

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Create JWT with very short expiry (2 seconds)
			// ═══════════════════════════════════════════════════════════
			const signResponse = await SELF.signJWT(jwtRequest, 2000, {
				// 2 seconds
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(signResponse.success).toBe(true);
			const token = signResponse.token!;

			// ═══════════════════════════════════════════════════════════
			// STEP 3: Validate immediately (should succeed)
			// ═══════════════════════════════════════════════════════════
			const validateImmediately = await SELF.validateToken(token);
			expect(validateImmediately.valid).toBe(true);
			expect(validateImmediately.entity).toBe(CUSTODIAN_USER.email);

			// Verify expiration timestamp is in the near future
			const decoded = decodeJwt(token);
			const now = Math.floor(Date.now() / 1000);
			expect(decoded.exp).toBeDefined();
			expect(decoded.exp).toBeGreaterThan(now);
			expect(decoded.exp).toBeLessThanOrEqual(now + 3); // Within 3 seconds

			// ═══════════════════════════════════════════════════════════
			// STEP 4: Wait for token to expire
			// ═══════════════════════════════════════════════════════════
			await new Promise((resolve) => setTimeout(resolve, 2500)); // Wait 2.5 seconds

			// ═══════════════════════════════════════════════════════════
			// STEP 5: Validate after expiration (should fail)
			// ═══════════════════════════════════════════════════════════
			// Use strict clock tolerance (0 seconds) to properly test expiration
			const validateAfterExpiry = await SELF.validateToken(token, 'default', '0 seconds');

			expect(validateAfterExpiry.valid).toBe(false);
			expect(validateAfterExpiry.error).toBeDefined();
			expect(validateAfterExpiry.error).toMatch(/exp.*claim|expired/i);
			expect(validateAfterExpiry.entity).toBeUndefined();
			expect(validateAfterExpiry.claims).toEqual([]);

			// ═══════════════════════════════════════════════════════════
			// STEP 6: Verify cryptographic validation also fails
			// ═══════════════════════════════════════════════════════════
			const publicKeyResponse = await SELF.getPublicKeyJWK();
			const jwks = createLocalJWKSet(publicKeyResponse);

			// jwtVerify should throw for expired token with strict tolerance
			await expect(
				jwtVerify(token, jwks, {
					clockTolerance: '0 seconds', // Strict tolerance to test expiration
				}),
			).rejects.toThrow();
		});
	});
});
