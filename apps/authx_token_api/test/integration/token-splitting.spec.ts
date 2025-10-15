import { env, SELF } from 'cloudflare:test';
import { decodeJwt } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_STANDARD_DURATIONS } from '@catalyst/schema_zod';
import { clearAllAuthzedRoles, custodianCreatesDataChannel, generateDataChannels, TEST_ORG_ID, validUsers } from '../utils/testUtils';

/**
 * Integration Tests: Catalyst Token Splitting
 *
 * These tests verify the complete workflow of splitting a multi-claim
 * catalyst token into single-use tokens for individual data channels.
 * This is a critical security feature that enables granular access control.
 */
describe('Integration: Catalyst Token Splitting Workflows', () => {
	const CUSTODIAN_CF_TOKEN = 'cf-custodian-token';
	const CUSTODIAN_USER = validUsers[CUSTODIAN_CF_TOKEN];

	beforeEach(async () => {
		await clearAllAuthzedRoles();
	});

	describe('Complete Token Splitting Flow', () => {
		it('should split multi-claim catalyst token into single-use tokens with correct properties', async () => {
			// ═══════════════════════════════════════════════════════════
			// COMPLETE HAPPY PATH: Create catalyst token with 3 claims,
			// split it into 3 single-use tokens, validate each token
			// ═══════════════════════════════════════════════════════════

			// STEP 1: Setup permissions and create 3 data channels
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const channels = generateDataChannels(3);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));
			const channelIds = createdChannels.map((ch) => ch.id);

			// STEP 2: Create catalyst token with all 3 claims (properly registered)
			const catalystTokenResponse = await SELF.signJWT(
				{
					entity: `${TEST_ORG_ID}/${CUSTODIAN_USER.email}`,
					claims: channelIds,
				},
				3600 * 1000, // 1 hour
				{ cfToken: CUSTODIAN_CF_TOKEN },
			);

			expect(catalystTokenResponse.success).toBe(true);
			const catalystToken = catalystTokenResponse.token!;

			// STEP 3: Split catalyst token into single-use tokens
			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(catalystToken);

			// Verify split succeeded
			expect(splitResponse.success).toBe(true);
			expect(splitResponse.error).toBeUndefined();
			expect(splitResponse.channelPermissions).toBeDefined();
			expect(splitResponse.channelPermissions).toHaveLength(3);

			// STEP 4: Verify each single-use token
			for (let i = 0; i < 3; i++) {
				const permission = splitResponse.channelPermissions![i];

				// Verify permission structure
				expect(permission.success).toBe(true);
				expect(permission.error).toBeUndefined();
				expect(permission.claim).toBe(channelIds[i]);
				expect(permission.dataChannel).toBeDefined();
				expect(permission.dataChannel?.id).toBe(channelIds[i]);
				expect(permission.dataChannel?.name).toBe(createdChannels[i].name);
				expect(permission.singleUseToken).toBeDefined();

				// STEP 5: Validate each single-use token
				const validateResponse = await SELF.validateToken(permission.singleUseToken!);

				expect(validateResponse.valid).toBe(true);
				expect(validateResponse.entity).toBe(`${TEST_ORG_ID}/${CUSTODIAN_USER.email}`);
				expect(validateResponse.claims).toHaveLength(1);
				expect(validateResponse.claims).toContain(channelIds[i]);
				expect(validateResponse.jwtId).toBeDefined();

				// STEP 6: Verify token expiration (should be 5 minutes)
				const decoded = decodeJwt(permission.singleUseToken!);

				expect(decoded.exp).toBeDefined();
				expect(decoded.iat).toBeDefined();

				const expiryDuration = (decoded.exp as number) - (decoded.iat as number);
				const fiveMinutesInSeconds = (5 * DEFAULT_STANDARD_DURATIONS.M) / 1000;

				// Allow 5 second tolerance for clock skew
				expect(expiryDuration).toBeGreaterThanOrEqual(fiveMinutesInSeconds - 5);
				expect(expiryDuration).toBeLessThanOrEqual(fiveMinutesInSeconds + 5);

				// STEP 7: Verify token has correct structure
				expect(decoded.sub).toBe(`${TEST_ORG_ID}/${CUSTODIAN_USER.email}`);
				expect(decoded.iss).toBe('catalyst:system:jwt:latest');
				expect(decoded.aud).toBe('catalyst:datachannel');
				expect(decoded.claims).toEqual([channelIds[i]]);
			}
		});

		it('should create single-use JWT for specific channel from catalyst token', async () => {
			// ═══════════════════════════════════════════════════════════
			// TEST: signSingleUseJWT() creates token for ONE specific channel
			// from a multi-claim catalyst token
			// ═══════════════════════════════════════════════════════════

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const channels = generateDataChannels(3);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));
			const channelIds = createdChannels.map((ch) => ch.id);

			// Create catalyst token with all 3 channels
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

			// Create single-use token for ONLY the second channel
			const targetChannel = channelIds[1];

			const singleUseResponse = await SELF.signSingleUseJWT(
				targetChannel,
				{
					catalystToken: catalystToken.token,
				},
				'default',
			);

			// Verify single-use token created
			expect(singleUseResponse.success).toBe(true);
			expect(singleUseResponse.token).toBeDefined();
			expect(singleUseResponse.expiration).toBeDefined();

			// Validate the single-use token
			const validateResponse = await SELF.validateToken(singleUseResponse.token!);

			expect(validateResponse.valid).toBe(true);
			expect(validateResponse.claims).toHaveLength(1);
			expect(validateResponse.claims).toContain(targetChannel);

			// Verify does NOT contain other channels
			expect(validateResponse.claims).not.toContain(channelIds[0]);
			expect(validateResponse.claims).not.toContain(channelIds[2]);

			// Verify 5-minute expiration
			const decoded = decodeJwt(singleUseResponse.token!);
			const expiryDuration = (decoded.exp as number) - (decoded.iat as number);
			const fiveMinutesInSeconds = (5 * DEFAULT_STANDARD_DURATIONS.M) / 1000;

			expect(expiryDuration).toBeGreaterThanOrEqual(fiveMinutesInSeconds - 5);
			expect(expiryDuration).toBeLessThanOrEqual(fiveMinutesInSeconds + 5);
		});

		it('should validate catalyst token before splitting', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Invalid catalyst token should fail validation
			// before attempting to split
			// ═══════════════════════════════════════════════════════════

			const invalidToken = 'not-a-valid-jwt-token';

			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(invalidToken);

			expect(splitResponse.success).toBe(false);
			expect(splitResponse.error).toBeDefined();
			expect(splitResponse.channelPermissions).toBeUndefined();
		});

		it('should handle partial failures when splitting tokens', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Some claims valid, some invalid (channels don't exist)
			// Should return partial results with errors for failed claims
			// ═══════════════════════════════════════════════════════════

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			// Create only 2 real channels
			const channels = generateDataChannels(2);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));
			const realChannelIds = createdChannels.map((ch) => ch.id);

			// Create catalyst token with 2 real channels + 1 fake channel
			const allClaims = [...realChannelIds, 'fake-channel-id'];

			// Grant permission for the fake channel too (so token creation succeeds)
			await env.AUTHZED.addDataChannelToOrg(TEST_ORG_ID, 'fake-channel-id');
			await env.AUTHZED.addOrgToDataChannel('fake-channel-id', TEST_ORG_ID);

			const catalystTokenResponse = await SELF.signJWT(
				{
					entity: `${TEST_ORG_ID}/${CUSTODIAN_USER.email}`,
					claims: allClaims,
				},
				3600 * 1000,
				{ cfToken: CUSTODIAN_CF_TOKEN },
			);

			expect(catalystTokenResponse.success).toBe(true);
			const catalystToken = catalystTokenResponse.token!;

			// Split token
			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(catalystToken);

			// Should succeed overall (partial success)
			expect(splitResponse.success).toBe(true);
			expect(splitResponse.channelPermissions).toBeDefined();

			// Verify we get results for all 3 claims
			expect(splitResponse.channelPermissions).toHaveLength(3);

			// Count successes and failures
			const successes = splitResponse.channelPermissions!.filter((p) => p.success === true);
			const failures = splitResponse.channelPermissions!.filter((p) => p.success === false);

			// Real channels should succeed, fake channel should fail
			expect(successes).toHaveLength(2);
			expect(failures).toHaveLength(1);

			// Verify fake channel has error
			const fakeChannelResult = splitResponse.channelPermissions!.find((p) => p.claim === 'fake-channel-id');

			expect(fakeChannelResult).toBeDefined();
			expect(fakeChannelResult!.success).toBe(false);
			expect(fakeChannelResult!.error).toBeDefined();
			expect(fakeChannelResult!.singleUseToken).toBeUndefined();

			// Verify real channels have tokens
			for (const realChannelId of realChannelIds) {
				const realResult = splitResponse.channelPermissions!.find((p) => p.claim === realChannelId);

				expect(realResult).toBeDefined();
				expect(realResult!.success).toBe(true);
				expect(realResult!.singleUseToken).toBeDefined();
				expect(realResult!.dataChannel).toBeDefined();
			}
		});

		it('should validate single-use tokens have correct security properties', async () => {
			// ═══════════════════════════════════════════════════════════
			// SECURITY TEST: Verify single-use tokens have:
			// - Short expiration (5 minutes)
			// - Single claim only
			// - Correct issuer, audience
			// - Unique JTI
			// ═══════════════════════════════════════════════════════════

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const channels = generateDataChannels(2);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));
			const channelIds = createdChannels.map((ch) => ch.id);

			// Create catalyst token (properly registered)
			const catalystTokenResponse = await SELF.signJWT(
				{
					entity: `${TEST_ORG_ID}/${CUSTODIAN_USER.email}`,
					claims: channelIds,
				},
				3600 * 1000,
				{ cfToken: CUSTODIAN_CF_TOKEN },
			);

			expect(catalystTokenResponse.success).toBe(true);
			const catalystToken = catalystTokenResponse.token!;

			// Split into single-use tokens
			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(catalystToken);

			expect(splitResponse.success).toBe(true);
			expect(splitResponse.channelPermissions).toHaveLength(2);

			const token1 = splitResponse.channelPermissions![0].singleUseToken!;
			const token2 = splitResponse.channelPermissions![1].singleUseToken!;

			// Decode both tokens
			const decoded1 = decodeJwt(token1);
			const decoded2 = decodeJwt(token2);

			// SECURITY CHECK 1: Short expiration (5 minutes)
			const expiry1 = (decoded1.exp as number) - (decoded1.iat as number);
			const expiry2 = (decoded2.exp as number) - (decoded2.iat as number);
			const fiveMinutesInSeconds = (5 * DEFAULT_STANDARD_DURATIONS.M) / 1000;

			expect(expiry1).toBeLessThanOrEqual(fiveMinutesInSeconds + 5);
			expect(expiry2).toBeLessThanOrEqual(fiveMinutesInSeconds + 5);

			// SECURITY CHECK 2: Single claim only
			expect(decoded1.claims).toHaveLength(1);
			expect(decoded2.claims).toHaveLength(1);

			// SECURITY CHECK 3: Correct issuer and audience
			expect(decoded1.iss).toBe('catalyst:system:jwt:latest');
			expect(decoded1.aud).toBe('catalyst:datachannel');
			expect(decoded2.iss).toBe('catalyst:system:jwt:latest');
			expect(decoded2.aud).toBe('catalyst:datachannel');

			// SECURITY CHECK 4: Unique JTI (JWT IDs must be different)
			expect(decoded1.jti).toBeDefined();
			expect(decoded2.jti).toBeDefined();
			expect(decoded1.jti).not.toBe(decoded2.jti);

			// SECURITY CHECK 5: Same subject (entity) as catalyst token
			const catalystDecoded = decodeJwt(catalystToken);
			expect(decoded1.sub).toBe(catalystDecoded.sub);
			expect(decoded2.sub).toBe(catalystDecoded.sub);

			// SECURITY CHECK 6: Claims match channel IDs exactly
			expect(decoded1.claims).toContain(channelIds[0]);
			expect(decoded2.claims).toContain(channelIds[1]);

			// No cross-contamination of claims
			expect(decoded1.claims).not.toContain(channelIds[1]);
			expect(decoded2.claims).not.toContain(channelIds[0]);
		});
	});

	describe('Error Handling in Token Splitting', () => {
		it('should handle catalyst token with empty claims array', async () => {
			// Create catalyst token with empty claims
			const catalystToken = await (async () => {
				const id = env.KEY_PROVIDER.idFromName('default');
				const stub = env.KEY_PROVIDER.get(id);
				return stub.signJWT(
					{
						entity: `${TEST_ORG_ID}/${CUSTODIAN_USER.email}`,
						claims: [],
					},
					3600 * 1000,
				);
			})();

			// Attempt to split
			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(catalystToken.token);

			// Should fail - no claims to split
			expect(splitResponse.success).toBe(false);
			expect(splitResponse.error).toBeDefined();
		});

		it('should handle signSingleUseJWT with empty claim on catalyst token', async () => {
			// Create catalyst token with empty string claim
			const catalystToken = await (async () => {
				const id = env.KEY_PROVIDER.idFromName('default');
				const stub = env.KEY_PROVIDER.get(id);
				return stub.signJWT(
					{
						entity: `${TEST_ORG_ID}/${CUSTODIAN_USER.email}`,
						claims: [''], // Empty string claim
					},
					3600 * 1000,
				);
			})();

			const response = await SELF.signSingleUseJWT('channel-id', {
				catalystToken: catalystToken.token,
			});

			expect(response.success).toBe(false);
			expect(response.error).toContain('invalid claims error');
		});

		it('should handle missing catalyst token in signSingleUseJWT', async () => {
			const response = await SELF.signSingleUseJWT('channel-id', {
				// No catalystToken provided
			});

			expect(response.success).toBe(false);
			expect(response.error).toContain('did not recieve a catalyst token');
		});
	});
});
