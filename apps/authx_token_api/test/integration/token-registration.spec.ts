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
			expect(signResponse.token).toBeDefined();
			expect(signResponse.expiration).toBeDefined();

			const token = signResponse.token!;

			const decoded = decodeJwt(token);
			expect(decoded.jti).toBeDefined();
			const jti = decoded.jti as string;

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);
			expect(registryResponse.data).toBeDefined();

			const registryEntry = registryResponse.data!;
			expect(registryEntry.id).toBe(jti);

			expect(registryEntry.name).toBeDefined();
			expect(registryEntry.name.length).toBeGreaterThan(0);

			expect(registryEntry.description).toBeDefined();
			expect(registryEntry.description.length).toBeGreaterThan(0);

			expect(registryEntry.claims).toEqual(jwtRequest.claims);

			expect(registryEntry.expiry).toBeInstanceOf(Date);
			const expectedExpiry = new Date(signResponse.expiration!);
			expect(registryEntry.expiry.getTime()).toBe(expectedExpiry.getTime());

			expect(registryEntry.organization).toBeDefined();
			expect(registryEntry.organization).toBe(TEST_ORG_ID);

			expect(registryEntry.status).toBe(JWTRegisterStatus.enum.active);
		});

		it('should include organization metadata from user context', async () => {
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

			const decoded = decodeJwt(token);
			const jti = decoded.jti as string;

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);
			expect(registryResponse.data!.organization).toBe(TEST_ORG_ID);
		});

		it('should register token with multiple claims correctly', async () => {
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const dataChannels = generateDataChannels(3);
			const createdChannels = await Promise.all(dataChannels.map((channel) => custodianCreatesDataChannel(channel)));
			const channelIds = createdChannels.map((ch) => ch.id);

			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: channelIds,
			};

			const signResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(signResponse.success).toBe(true);
			const token = signResponse.token!;

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
			const systemRequest = {
				callingService: 'data-channel-certifier',
				channelId: 'test-channel-123',
				purpose: 'channel-validation',
				duration: 300, // 5 minutes
			};

			const signResponse = await SELF.signSystemJWT(systemRequest, 'default');

			expect(signResponse.success).toBe(true);
			expect(signResponse.token).toBeDefined();
			expect(signResponse.expiration).toBeDefined();

			const token = signResponse.token!;

			const decoded = decodeJwt(token);
			expect(decoded.jti).toBeDefined();
			const jti = decoded.jti as string;

			expect(decoded.sub).toBe('system-data-channel-certifier');

			// Note: We need a CF token to call registry.get(), using custodian token
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);
			expect(registryResponse.data).toBeDefined();

			const registryEntry = registryResponse.data!;
			expect(registryEntry.id).toBe(jti);

			expect(registryEntry.name).toBeDefined();
			expect(registryEntry.name.toLowerCase()).toContain('system');

			expect(registryEntry.description).toBeDefined();
			expect(registryEntry.description).toContain(systemRequest.purpose);

			expect(registryEntry.claims).toEqual(['test-channel-123']);

			expect(registryEntry.expiry).toBeInstanceOf(Date);
			const expectedExpiry = new Date(signResponse.expiration!);
			expect(registryEntry.expiry.getTime()).toBe(expectedExpiry.getTime());

			expect(registryEntry.organization).toBeDefined();

			expect(registryEntry.status).toBe(JWTRegisterStatus.enum.active);
		});

		it('should register system token with multiple channel IDs', async () => {
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

			const decoded = decodeJwt(token);
			const jti = decoded.jti as string;

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);
			expect(registryResponse.data!.claims).toEqual(channelIds);
			expect(registryResponse.data!.claims.length).toBe(4);
		});

		it('should register system tokens with different durations correctly', async () => {
			const systemRequest = {
				callingService: 'data-channel-certifier',
				channelId: 'test-channel',
				purpose: 'long-running-validation',
				duration: 3600, // 1 hour (maximum)
			};

			const signResponse = await SELF.signSystemJWT(systemRequest, 'default');
			expect(signResponse.success).toBe(true);
			const token = signResponse.token!;

			const decoded = decodeJwt(token);
			const jti = decoded.jti as string;

			const expiryDuration = (decoded.exp as number) - (decoded.iat as number);
			expect(expiryDuration).toBeGreaterThanOrEqual(3595);
			expect(expiryDuration).toBeLessThanOrEqual(3605);

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);

			const expectedExpiry = new Date(signResponse.expiration!);
			expect(registryResponse.data!.expiry.getTime()).toBe(expectedExpiry.getTime());
		});
	});

	describe('signSingleUseJWT() Token Registration', () => {
		it('should register single-use token in registry with jwt.jti as ID', async () => {
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
					3600 * 1000, // 1 hour
				);
			})();

			expect(catalystToken.token).toBeDefined();

			const singleUseResponse = await SELF.signSingleUseJWT(createdChannel.id, { catalystToken: catalystToken.token }, 'default');

			expect(singleUseResponse.success).toBe(true);
			expect(singleUseResponse.token).toBeDefined();
			expect(singleUseResponse.expiration).toBeDefined();

			const token = singleUseResponse.token!;

			const decoded = decodeJwt(token);
			expect(decoded.jti).toBeDefined();
			const jti = decoded.jti as string;

			expect(decoded.sub).toBe(`${TEST_ORG_ID}/${CUSTODIAN_USER.email}`);

			expect(decoded.claims).toEqual([createdChannel.id]);

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);
			expect(registryResponse.data).toBeDefined();

			const registryEntry = registryResponse.data!;
			expect(registryEntry.id).toBe(jti);

			expect(registryEntry.name).toBeDefined();
			expect(registryEntry.name.length).toBeGreaterThan(0);

			expect(registryEntry.description).toBeDefined();
			expect(registryEntry.description.toLowerCase()).toContain('single-use');

			expect(registryEntry.claims).toEqual([createdChannel.id]);
			expect(registryEntry.claims.length).toBe(1);

			expect(registryEntry.expiry).toBeInstanceOf(Date);
			const expectedExpiry = new Date(singleUseResponse.expiration!);
			expect(registryEntry.expiry.getTime()).toBe(expectedExpiry.getTime());

			expect(registryEntry.organization).toBe(TEST_ORG_ID);

			expect(registryEntry.status).toBe(JWTRegisterStatus.enum.active);
		});

		it('should register single-use token with 5-minute expiration', async () => {
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

			const singleUseResponse = await SELF.signSingleUseJWT(createdChannel.id, { catalystToken: catalystToken.token }, 'default');

			expect(singleUseResponse.success).toBe(true);
			const token = singleUseResponse.token!;

			const decoded = decodeJwt(token);
			const expiryDuration = (decoded.exp as number) - (decoded.iat as number);

			// 5 minutes = 300 seconds, allow 5 second tolerance
			expect(expiryDuration).toBeGreaterThanOrEqual(295);
			expect(expiryDuration).toBeLessThanOrEqual(305);

			const jti = decoded.jti as string;

			const registryResponse = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryResponse.success).toBe(true);

			const expectedExpiry = new Date(singleUseResponse.expiration!);
			expect(registryResponse.data!.expiry.getTime()).toBe(expectedExpiry.getTime());

			const now = Date.now();
			const expiryTime = registryResponse.data!.expiry.getTime();
			const fiveMinutesMs = 5 * 60 * 1000;

			expect(expiryTime).toBeGreaterThan(now);
			expect(expiryTime).toBeLessThanOrEqual(now + fiveMinutesMs + 5000); // 5 second tolerance
		});

		it('should register multiple single-use tokens from same catalyst token', async () => {
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const dataChannels = generateDataChannels(3);
			const createdChannels = await Promise.all(dataChannels.map((channel) => custodianCreatesDataChannel(channel)));
			const channelIds = createdChannels.map((ch) => ch.id);

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

			const singleUseTokens = await Promise.all(
				channelIds.map((channelId) => SELF.signSingleUseJWT(channelId, { catalystToken: catalystToken.token }, 'default')),
			);

			expect(singleUseTokens).toHaveLength(3);
			singleUseTokens.forEach((response) => {
				expect(response.success).toBe(true);
				expect(response.token).toBeDefined();
			});

			const jwtIds = singleUseTokens.map((response) => {
				const decoded = decodeJwt(response.token!);
				return decoded.jti as string;
			});

			const uniqueJtis = new Set(jwtIds);
			expect(uniqueJtis.size).toBe(3);

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

			const validateBefore = await SELF.validateToken(token);
			expect(validateBefore.valid).toBe(true);
			expect(validateBefore.entity).toBe(CUSTODIAN_USER.email);
			expect(validateBefore.jwtId).toBeDefined();

			const jti = validateBefore.jwtId!;

			const registryBefore = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryBefore.success).toBe(true);
			expect(registryBefore.data!.status).toBe(JWTRegisterStatus.enum.active);

			const deleteResponse = await env.ISSUED_JWT_REGISTRY.delete({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(deleteResponse).toBe(true);

			const registryAfter = await env.ISSUED_JWT_REGISTRY.get({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(registryAfter.success).toBe(true);
			expect(registryAfter.data!.status).toBe(JWTRegisterStatus.enum.deleted);

			const validateAfter = await SELF.validateToken(token);

			expect(validateAfter.valid).toBe(false);
			expect(validateAfter.error).toBeDefined();
			expect(validateAfter.entity).toBeUndefined();
			expect(validateAfter.claims).toEqual([]);
		});

		it('should fail authentication for system token when deleted', async () => {
			const systemRequest = {
				callingService: 'data-channel-certifier',
				channelId: 'test-channel-deletion',
				purpose: 'test-deletion',
				duration: 300,
			};

			const signResponse = await SELF.signSystemJWT(systemRequest, 'default');
			expect(signResponse.success).toBe(true);
			const token = signResponse.token!;

			const validateBefore = await SELF.validateToken(token);
			expect(validateBefore.valid).toBe(true);

			const jti = validateBefore.jwtId!;

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const deleteResponse = await env.ISSUED_JWT_REGISTRY.delete({ cfToken: CUSTODIAN_CF_TOKEN }, jti, 'default');

			expect(deleteResponse).toBe(true);

			const validateAfter = await SELF.validateToken(token);

			expect(validateAfter.valid).toBe(false);
			expect(validateAfter.error).toBeDefined();
		});
	});
});
