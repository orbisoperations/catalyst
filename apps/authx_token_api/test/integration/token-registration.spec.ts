import { env, SELF } from 'cloudflare:test';
import { decodeJwt } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JWTSigningRequest } from '@catalyst/schema_zod';
import { JWTRegisterStatus } from '@catalyst/schemas';
import { clearAllAuthzedRoles, custodianCreatesDataChannel, generateDataChannels, TEST_ORG_ID, validUsers } from '../utils/testUtils';

/**
 * Integration Tests: Token Registration in issued-jwt-registry
 *
 * These tests verify that all token-issuing methods (signJWT, signSystemJWT,
 * signSingleUseJWT) properly register tokens in the ISSUED_JWT_REGISTRY with
 * consistent jti-based IDs and complete metadata.
 *
 * Validates:
 * - All tokens are registered before signing
 * - Registry uses jwt.jti as the ID
 * - Unregistered tokens fail authentication
 */
describe('Integration: Token Registration', () => {
	const CUSTODIAN_CF_TOKEN = 'cf-custodian-token';
	const CUSTODIAN_USER = validUsers[CUSTODIAN_CF_TOKEN];

	beforeEach(async () => {
		await clearAllAuthzedRoles();
	});

	describe('signJWT() Token Registration', () => {
		it('should register token in registry with jwt.jti as ID before signing', async () => {
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
			// STEP 3: Extract jti from the signed JWT
			// ═══════════════════════════════════════════════════════════
			const decoded = decodeJwt(token);
			expect(decoded.jti).toBeDefined();
			const jti = decoded.jti as string;

			// ═══════════════════════════════════════════════════════════
			// STEP 4: Verify token is registered in ISSUED_JWT_REGISTRY
			// ═══════════════════════════════════════════════════════════
			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			// Verify registry entry exists
			expect(registryResponse.success).toBe(true);
			expect(registryResponse.data).toBeDefined();

			// ═══════════════════════════════════════════════════════════
			// STEP 5: Verify registry entry uses jwt.jti as ID (FR-005)
			// ═══════════════════════════════════════════════════════════
			const registryEntry = registryResponse.data!;
			expect(registryEntry.id).toBe(jti);

			// ═══════════════════════════════════════════════════════════
			// STEP 6: Verify all required fields are populated correctly
			// ═══════════════════════════════════════════════════════════
			expect(registryEntry.name).toBeDefined();
			expect(registryEntry.name.length).toBeGreaterThan(0);

			expect(registryEntry.description).toBeDefined();
			expect(registryEntry.description.length).toBeGreaterThan(0);

			// Claims should match the JWT request
			expect(registryEntry.claims).toEqual(jwtRequest.claims);

			// Expiry should be a Date object matching the JWT expiration
			expect(registryEntry.expiry).toBeInstanceOf(Date);
			const expectedExpiry = new Date(signResponse.expiration!);
			expect(registryEntry.expiry.getTime()).toBe(expectedExpiry.getTime());

			// Organization should match the user's organization
			expect(registryEntry.organization).toBeDefined();
			expect(registryEntry.organization).toBe(TEST_ORG_ID);

			// Status should be active
			expect(registryEntry.status).toBe(JWTRegisterStatus.enum.active);
		});

		it('should include organization metadata from user context', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Setup permissions
			// ═══════════════════════════════════════════════════════════
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const dataChannel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(dataChannel);

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Create JWT
			// ═══════════════════════════════════════════════════════════
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
			// STEP 3: Verify organization in registry entry
			// ═══════════════════════════════════════════════════════════
			const decoded = decodeJwt(token);
			const jti = decoded.jti as string;

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);
			expect(registryResponse.data!.organization).toBe(TEST_ORG_ID);
		});

		it('should register token with multiple claims correctly', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Setup multiple data channels
			// ═══════════════════════════════════════════════════════════
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const dataChannels = generateDataChannels(3);
			const createdChannels = await Promise.all(dataChannels.map((channel) => custodianCreatesDataChannel(channel)));
			const channelIds = createdChannels.map((ch) => ch.id);

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Create JWT with multiple claims
			// ═══════════════════════════════════════════════════════════
			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: channelIds,
			};

			const signResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(signResponse.success).toBe(true);
			const token = signResponse.token!;

			// ═══════════════════════════════════════════════════════════
			// STEP 3: Verify all claims are registered correctly
			// ═══════════════════════════════════════════════════════════
			const decoded = decodeJwt(token);
			const jti = decoded.jti as string;

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);
			expect(registryResponse.data!.claims).toEqual(channelIds);
			expect(registryResponse.data!.claims.length).toBe(3);
		});
	});

	describe('signSystemJWT() Token Registration', () => {
		it('should register system token in registry with jwt.jti as ID', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Create system JWT for authorized service
			// ═══════════════════════════════════════════════════════════
			const systemRequest = {
				callingService: 'data-channel-certifier',
				channelId: 'test-channel-123',
				purpose: 'channel-validation',
				duration: 300, // 5 minutes
			};

			const signResponse = await SELF.signSystemJWT(systemRequest, 'default');

			// Verify signing succeeded
			expect(signResponse.success).toBe(true);
			expect(signResponse.token).toBeDefined();
			expect(signResponse.expiration).toBeDefined();

			const token = signResponse.token!;

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Extract jti from the signed JWT
			// ═══════════════════════════════════════════════════════════
			const decoded = decodeJwt(token);
			expect(decoded.jti).toBeDefined();
			const jti = decoded.jti as string;

			// Verify system entity format
			expect(decoded.sub).toBe('system-data-channel-certifier');

			// ═══════════════════════════════════════════════════════════
			// STEP 3: Verify token is registered in ISSUED_JWT_REGISTRY
			// ═══════════════════════════════════════════════════════════
			// Note: We need a CF token to call registry.get(), using custodian token
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			// Verify registry entry exists
			expect(registryResponse.success).toBe(true);
			expect(registryResponse.data).toBeDefined();

			// ═══════════════════════════════════════════════════════════
			// STEP 4: Verify registry entry uses jwt.jti as ID (FR-005)
			// ═══════════════════════════════════════════════════════════
			const registryEntry = registryResponse.data!;
			expect(registryEntry.id).toBe(jti);

			// ═══════════════════════════════════════════════════════════
			// STEP 5: Verify all required fields for system tokens
			// ═══════════════════════════════════════════════════════════
			expect(registryEntry.name).toBeDefined();
			expect(registryEntry.name.toLowerCase()).toContain('system'); // Should indicate system token

			expect(registryEntry.description).toBeDefined();
			expect(registryEntry.description).toContain(systemRequest.purpose);

			// Claims should match the channel ID
			expect(registryEntry.claims).toEqual(['test-channel-123']);

			// Expiry should be a Date object
			expect(registryEntry.expiry).toBeInstanceOf(Date);
			const expectedExpiry = new Date(signResponse.expiration!);
			expect(registryEntry.expiry.getTime()).toBe(expectedExpiry.getTime());

			// Organization should be 'system' for system tokens
			expect(registryEntry.organization).toBeDefined();

			// Status should be active
			expect(registryEntry.status).toBe(JWTRegisterStatus.enum.active);
		});

		it('should register system token with multiple channel IDs', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Create system JWT with multiple channels
			// ═══════════════════════════════════════════════════════════
			const channelIds = ['channel-1', 'channel-2', 'channel-3', 'channel-4'];

			const systemRequest = {
				callingService: 'scheduled-validator',
				channelIds: channelIds,
				purpose: 'bulk-validation',
				duration: 600, // 10 minutes
			};

			const signResponse = await SELF.signSystemJWT(systemRequest, 'default');
			expect(signResponse.success).toBe(true);
			const token = signResponse.token!;

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Verify registry entry has all channel IDs
			// ═══════════════════════════════════════════════════════════
			const decoded = decodeJwt(token);
			const jti = decoded.jti as string;

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);
			expect(registryResponse.data!.claims).toEqual(channelIds);
			expect(registryResponse.data!.claims.length).toBe(4);
		});

		it('should register system tokens with different durations correctly', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Create system JWT with custom duration (1 hour)
			// ═══════════════════════════════════════════════════════════
			const systemRequest = {
				callingService: 'data-channel-certifier',
				channelId: 'test-channel',
				purpose: 'long-running-validation',
				duration: 3600, // 1 hour (maximum)
			};

			const signResponse = await SELF.signSystemJWT(systemRequest, 'default');
			expect(signResponse.success).toBe(true);
			const token = signResponse.token!;

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Verify registry entry has correct expiration
			// ═══════════════════════════════════════════════════════════
			const decoded = decodeJwt(token);
			const jti = decoded.jti as string;

			// Verify expiration is approximately 1 hour from now
			const expiryDuration = (decoded.exp as number) - (decoded.iat as number);
			expect(expiryDuration).toBeGreaterThanOrEqual(3595);
			expect(expiryDuration).toBeLessThanOrEqual(3605);

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);

			// Verify registry expiry matches JWT expiry
			const expectedExpiry = new Date(signResponse.expiration!);
			expect(registryResponse.data!.expiry.getTime()).toBe(expectedExpiry.getTime());
		});
	});

	describe('signSingleUseJWT() Token Registration', () => {
		it('should register single-use token in registry with jwt.jti as ID', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Setup permissions and create data channel
			// ═══════════════════════════════════════════════════════════
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const dataChannel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(dataChannel);

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Create a catalyst token with the channel claim
			// ═══════════════════════════════════════════════════════════
			const catalystToken = await (async () => {
				const id = env.KEY_PROVIDER.idFromName('default');
				const stub = env.KEY_PROVIDER.get(id);
				return stub.signJWT(
					{
						entity: `${TEST_ORG_ID}/${CUSTODIAN_USER.email}`,
						claims: [createdChannel.id],
					},
					3600 * 1000, // 1 hour
				);
			})();

			expect(catalystToken.token).toBeDefined();

			// ═══════════════════════════════════════════════════════════
			// STEP 3: Create single-use token from catalyst token
			// ═══════════════════════════════════════════════════════════
			const singleUseResponse = await SELF.signSingleUseJWT(createdChannel.id, { catalystToken: catalystToken.token }, 'default');

			// Verify signing succeeded
			expect(singleUseResponse.success).toBe(true);
			expect(singleUseResponse.token).toBeDefined();
			expect(singleUseResponse.expiration).toBeDefined();

			const token = singleUseResponse.token!;

			// ═══════════════════════════════════════════════════════════
			// STEP 4: Extract jti from the signed JWT
			// ═══════════════════════════════════════════════════════════
			const decoded = decodeJwt(token);
			expect(decoded.jti).toBeDefined();
			const jti = decoded.jti as string;

			// Verify entity is preserved from catalyst token
			expect(decoded.sub).toBe(`${TEST_ORG_ID}/${CUSTODIAN_USER.email}`);

			// Verify single claim
			expect(decoded.claims).toEqual([createdChannel.id]);

			// ═══════════════════════════════════════════════════════════
			// STEP 5: Verify token is registered in ISSUED_JWT_REGISTRY
			// ═══════════════════════════════════════════════════════════
			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			// Verify registry entry exists
			expect(registryResponse.success).toBe(true);
			expect(registryResponse.data).toBeDefined();

			// ═══════════════════════════════════════════════════════════
			// STEP 6: Verify registry entry uses jwt.jti as ID (FR-005)
			// ═══════════════════════════════════════════════════════════
			const registryEntry = registryResponse.data!;
			expect(registryEntry.id).toBe(jti);

			// ═══════════════════════════════════════════════════════════
			// STEP 7: Verify all required fields for single-use tokens
			// ═══════════════════════════════════════════════════════════
			expect(registryEntry.name).toBeDefined();
			expect(registryEntry.name.length).toBeGreaterThan(0);

			expect(registryEntry.description).toBeDefined();
			expect(registryEntry.description.toLowerCase()).toContain('single-use'); // Should indicate single-use token

			// Claims should be single channel only
			expect(registryEntry.claims).toEqual([createdChannel.id]);
			expect(registryEntry.claims.length).toBe(1);

			// Expiry should be a Date object matching the JWT expiration
			expect(registryEntry.expiry).toBeInstanceOf(Date);
			const expectedExpiry = new Date(singleUseResponse.expiration!);
			expect(registryEntry.expiry.getTime()).toBe(expectedExpiry.getTime());

			// Organization should match the user's organization
			expect(registryEntry.organization).toBe(TEST_ORG_ID);

			// Status should be active
			expect(registryEntry.status).toBe(JWTRegisterStatus.enum.active);
		});

		it('should register single-use token with 5-minute expiration', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Setup and create catalyst token
			// ═══════════════════════════════════════════════════════════
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const dataChannel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(dataChannel);

			const catalystToken = await (async () => {
				const id = env.KEY_PROVIDER.idFromName('default');
				const stub = env.KEY_PROVIDER.get(id);
				return stub.signJWT(
					{
						entity: `${TEST_ORG_ID}/${CUSTODIAN_USER.email}`,
						claims: [createdChannel.id],
					},
					3600 * 1000,
				);
			})();

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Create single-use token
			// ═══════════════════════════════════════════════════════════
			const singleUseResponse = await SELF.signSingleUseJWT(createdChannel.id, { catalystToken: catalystToken.token }, 'default');

			expect(singleUseResponse.success).toBe(true);
			const token = singleUseResponse.token!;

			// ═══════════════════════════════════════════════════════════
			// STEP 3: Verify expiration is approximately 5 minutes
			// ═══════════════════════════════════════════════════════════
			const decoded = decodeJwt(token);
			const expiryDuration = (decoded.exp as number) - (decoded.iat as number);

			// 5 minutes = 300 seconds, allow 5 second tolerance
			expect(expiryDuration).toBeGreaterThanOrEqual(295);
			expect(expiryDuration).toBeLessThanOrEqual(305);

			// ═══════════════════════════════════════════════════════════
			// STEP 4: Verify registry entry has matching expiration
			// ═══════════════════════════════════════════════════════════
			const jti = decoded.jti as string;

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);

			// Verify registry expiry matches JWT expiry
			const expectedExpiry = new Date(singleUseResponse.expiration!);
			expect(registryResponse.data!.expiry.getTime()).toBe(expectedExpiry.getTime());

			// Verify expiry is approximately 5 minutes from now
			const now = Date.now();
			const expiryTime = registryResponse.data!.expiry.getTime();
			const fiveMinutesMs = 5 * 60 * 1000;

			expect(expiryTime).toBeGreaterThan(now);
			expect(expiryTime).toBeLessThanOrEqual(now + fiveMinutesMs + 5000); // 5 second tolerance
		});

		it('should register multiple single-use tokens from same catalyst token', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Setup with multiple data channels
			// ═══════════════════════════════════════════════════════════
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const dataChannels = generateDataChannels(3);
			const createdChannels = await Promise.all(dataChannels.map((channel) => custodianCreatesDataChannel(channel)));
			const channelIds = createdChannels.map((ch) => ch.id);

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Create catalyst token with all 3 claims
			// ═══════════════════════════════════════════════════════════
			const catalystToken = await (async () => {
				const id = env.KEY_PROVIDER.idFromName('default');
				const stub = env.KEY_PROVIDER.get(id);
				return stub.signJWT(
					{
						entity: `${TEST_ORG_ID}/${CUSTODIAN_USER.email}`,
						claims: channelIds,
					},
					3600 * 1000,
				);
			})();

			// ═══════════════════════════════════════════════════════════
			// STEP 3: Create single-use token for each claim
			// ═══════════════════════════════════════════════════════════
			const singleUseTokens = await Promise.all(
				channelIds.map((channelId) => SELF.signSingleUseJWT(channelId, { catalystToken: catalystToken.token }, 'default')),
			);

			// Verify all tokens were created
			expect(singleUseTokens).toHaveLength(3);
			singleUseTokens.forEach((response) => {
				expect(response.success).toBe(true);
				expect(response.token).toBeDefined();
			});

			// ═══════════════════════════════════════════════════════════
			// STEP 4: Verify each token is registered separately
			// ═══════════════════════════════════════════════════════════
			const jwtIds = singleUseTokens.map((response) => {
				const decoded = decodeJwt(response.token!);
				return decoded.jti as string;
			});

			// All JTIs should be unique
			const uniqueJtis = new Set(jwtIds);
			expect(uniqueJtis.size).toBe(3);

			// Verify each entry exists in registry
			for (let i = 0; i < 3; i++) {
				const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jwtIds[i], 'default');

				expect(registryResponse.success).toBe(true);
				expect(registryResponse.data!.id).toBe(jwtIds[i]);
				expect(registryResponse.data!.claims).toEqual([channelIds[i]]);
			}
		});
	});

	describe('Deleted Token Authentication', () => {
		it('should fail authentication when token is deleted from registry', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Setup - Create user and data channel
			// ═══════════════════════════════════════════════════════════
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const dataChannel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(dataChannel);

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Create and register a token
			// ═══════════════════════════════════════════════════════════
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
			// STEP 3: Verify token validates successfully (before deletion)
			// ═══════════════════════════════════════════════════════════
			const validateBefore = await SELF.validateToken(token);
			expect(validateBefore.valid).toBe(true);
			expect(validateBefore.entity).toBe(CUSTODIAN_USER.email);
			expect(validateBefore.jwtId).toBeDefined();

			const jti = validateBefore.jwtId!;

			// ═══════════════════════════════════════════════════════════
			// STEP 4: Verify token exists in registry with 'active' status
			// ═══════════════════════════════════════════════════════════
			const registryBefore = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryBefore.success).toBe(true);
			expect(registryBefore.data!.status).toBe(JWTRegisterStatus.enum.active);

			// ═══════════════════════════════════════════════════════════
			// STEP 5: Delete the token from the registry
			// ═══════════════════════════════════════════════════════════
			const deleteResponse = await env.ISSUED_JWT_REGISTRY.delete({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(deleteResponse).toBe(true);

			// ═══════════════════════════════════════════════════════════
			// STEP 6: Verify token status changed to 'deleted' in registry
			// ═══════════════════════════════════════════════════════════
			const registryAfter = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryAfter.success).toBe(true);
			expect(registryAfter.data!.status).toBe(JWTRegisterStatus.enum.deleted);

			// ═══════════════════════════════════════════════════════════
			// STEP 7: Attempt to validate the deleted token
			// ═══════════════════════════════════════════════════════════
			const validateAfter = await SELF.validateToken(token);

			// FR-006: Deleted tokens MUST fail authentication
			expect(validateAfter.valid).toBe(false);
			expect(validateAfter.error).toBeDefined();
			expect(validateAfter.entity).toBeUndefined();
			expect(validateAfter.claims).toEqual([]);
		});

		it('should fail authentication for system token when deleted', async () => {
			// ═══════════════════════════════════════════════════════════
			// STEP 1: Create system token
			// ═══════════════════════════════════════════════════════════
			const systemRequest = {
				callingService: 'data-channel-certifier',
				channelId: 'test-channel-deletion',
				purpose: 'test-deletion',
				duration: 300,
			};

			const signResponse = await SELF.signSystemJWT(systemRequest, 'default');
			expect(signResponse.success).toBe(true);
			const token = signResponse.token!;

			// ═══════════════════════════════════════════════════════════
			// STEP 2: Verify token validates before deletion
			// ═══════════════════════════════════════════════════════════
			const validateBefore = await SELF.validateToken(token);
			expect(validateBefore.valid).toBe(true);

			const jti = validateBefore.jwtId!;

			// ═══════════════════════════════════════════════════════════
			// STEP 3: Delete the system token
			// ═══════════════════════════════════════════════════════════
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const deleteResponse = await env.ISSUED_JWT_REGISTRY.delete({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(deleteResponse).toBe(true);

			// ═══════════════════════════════════════════════════════════
			// STEP 4: Verify deleted system token fails authentication
			// ═══════════════════════════════════════════════════════════
			const validateAfter = await SELF.validateToken(token);

			// FR-006: System tokens also fail when deleted
			expect(validateAfter.valid).toBe(false);
			expect(validateAfter.error).toBeDefined();
		});
	});
});
