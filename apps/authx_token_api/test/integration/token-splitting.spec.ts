import { env, SELF } from 'cloudflare:test';
import { decodeJwt } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_STANDARD_DURATIONS } from '@catalyst/schema_zod';
import { JWTAudience } from '../../../../packages/schemas';
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
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const channels = generateDataChannels(3);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));
			const channelIds = createdChannels.map((ch) => ch.id);

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

			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(catalystToken);

			expect(splitResponse.success).toBe(true);
			expect(splitResponse.error).toBeUndefined();
			expect(splitResponse.channelPermissions).toBeDefined();
			expect(splitResponse.channelPermissions).toHaveLength(3);

			for (let i = 0; i < 3; i++) {
				const permission = splitResponse.channelPermissions![i];

				expect(permission.success).toBe(true);
				expect(permission.error).toBeUndefined();
				expect(permission.claim).toBe(channelIds[i]);
				expect(permission.dataChannel).toBeDefined();
				expect(permission.dataChannel?.id).toBe(channelIds[i]);
				expect(permission.dataChannel?.name).toBe(createdChannels[i].name);
				expect(permission.singleUseToken).toBeDefined();

				const validateResponse = await SELF.validateToken(permission.singleUseToken!);

				expect(validateResponse.valid).toBe(true);
				expect(validateResponse.entity).toBe(`${TEST_ORG_ID}/${CUSTODIAN_USER.email}`);
				expect(validateResponse.claims).toHaveLength(1);
				expect(validateResponse.claims).toContain(channelIds[i]);
				expect(validateResponse.jwtId).toBeDefined();

				const decoded = decodeJwt(permission.singleUseToken!);

				expect(decoded.exp).toBeDefined();
				expect(decoded.iat).toBeDefined();

				const expiryDuration = (decoded.exp as number) - (decoded.iat as number);
				const fiveMinutesInSeconds = (5 * DEFAULT_STANDARD_DURATIONS.M) / 1000;

				// Allow 5 second tolerance for clock skew
				expect(expiryDuration).toBeGreaterThanOrEqual(fiveMinutesInSeconds - 5);
				expect(expiryDuration).toBeLessThanOrEqual(fiveMinutesInSeconds + 5);

				expect(decoded.sub).toBe(`${TEST_ORG_ID}/${CUSTODIAN_USER.email}`);
				expect(decoded.iss).toBe('catalyst:system:jwt:latest');
				expect(decoded.aud).toBe(JWTAudience.enum['catalyst:datachannel']);
				expect(decoded.claims).toEqual([channelIds[i]]);
			}
		});

		it('should create single-use JWT for specific channel from catalyst token', async () => {
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const channels = generateDataChannels(3);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));
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

			const targetChannel = channelIds[1];

			const singleUseResponse = await SELF.signSingleUseJWT(
				targetChannel,
				{
					catalystToken: catalystToken.token,
				},
				'default',
			);

			expect(singleUseResponse.success).toBe(true);
			expect(singleUseResponse.token).toBeDefined();
			expect(singleUseResponse.expiration).toBeDefined();

			const validateResponse = await SELF.validateToken(singleUseResponse.token!);

			expect(validateResponse.valid).toBe(true);
			expect(validateResponse.claims).toHaveLength(1);
			expect(validateResponse.claims).toContain(targetChannel);

			expect(validateResponse.claims).not.toContain(channelIds[0]);
			expect(validateResponse.claims).not.toContain(channelIds[2]);

			// 5 minutes
			const decoded = decodeJwt(singleUseResponse.token!);
			const expiryDuration = (decoded.exp as number) - (decoded.iat as number);
			const fiveMinutesInSeconds = (5 * DEFAULT_STANDARD_DURATIONS.M) / 1000;

			expect(expiryDuration).toBeGreaterThanOrEqual(fiveMinutesInSeconds - 5);
			expect(expiryDuration).toBeLessThanOrEqual(fiveMinutesInSeconds + 5);
		});

		it('should validate catalyst token before splitting', async () => {
			const invalidToken = 'not-a-valid-jwt-token';

			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(invalidToken);

			expect(splitResponse.success).toBe(false);
			expect(splitResponse.error).toBeDefined();
			expect(splitResponse.channelPermissions).toBeUndefined();
		});

		it('should handle partial failures when splitting tokens', async () => {
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const channels = generateDataChannels(2);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));
			const realChannelIds = createdChannels.map((ch) => ch.id);

			const allClaims = [...realChannelIds, 'fake-channel-id'];

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

			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(catalystToken);

			expect(splitResponse.success).toBe(true);
			expect(splitResponse.channelPermissions).toBeDefined();

			expect(splitResponse.channelPermissions).toHaveLength(3);

			const successes = splitResponse.channelPermissions!.filter((p) => p.success === true);
			const failures = splitResponse.channelPermissions!.filter((p) => p.success === false);

			expect(successes).toHaveLength(2);
			expect(failures).toHaveLength(1);

			const fakeChannelResult = splitResponse.channelPermissions!.find((p) => p.claim === 'fake-channel-id');

			expect(fakeChannelResult).toBeDefined();
			expect(fakeChannelResult!.success).toBe(false);
			expect(fakeChannelResult!.error).toBeDefined();
			expect(fakeChannelResult!.singleUseToken).toBeUndefined();

			for (const realChannelId of realChannelIds) {
				const realResult = splitResponse.channelPermissions!.find((p) => p.claim === realChannelId);

				expect(realResult).toBeDefined();
				expect(realResult!.success).toBe(true);
				expect(realResult!.singleUseToken).toBeDefined();
				expect(realResult!.dataChannel).toBeDefined();
			}
		});

		it('should validate single-use tokens have correct security properties', async () => {
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const channels = generateDataChannels(2);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));
			const channelIds = createdChannels.map((ch) => ch.id);

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

			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(catalystToken);

			expect(splitResponse.success).toBe(true);
			expect(splitResponse.channelPermissions).toHaveLength(2);

			const token1 = splitResponse.channelPermissions![0].singleUseToken!;
			const token2 = splitResponse.channelPermissions![1].singleUseToken!;

			const decoded1 = decodeJwt(token1);
			const decoded2 = decodeJwt(token2);

			// 5 minutes
			const expiry1 = (decoded1.exp as number) - (decoded1.iat as number);
			const expiry2 = (decoded2.exp as number) - (decoded2.iat as number);
			const fiveMinutesInSeconds = (5 * DEFAULT_STANDARD_DURATIONS.M) / 1000;

			expect(expiry1).toBeLessThanOrEqual(fiveMinutesInSeconds + 5);
			expect(expiry2).toBeLessThanOrEqual(fiveMinutesInSeconds + 5);

			expect(decoded1.claims).toHaveLength(1);
			expect(decoded2.claims).toHaveLength(1);

			expect(decoded1.iss).toBe('catalyst:system:jwt:latest');
			expect(decoded1.aud).toBe(JWTAudience.enum['catalyst:datachannel']);
			expect(decoded2.iss).toBe('catalyst:system:jwt:latest');
			expect(decoded2.aud).toBe(JWTAudience.enum['catalyst:datachannel']);

			expect(decoded1.jti).toBeDefined();
			expect(decoded2.jti).toBeDefined();
			expect(decoded1.jti).not.toBe(decoded2.jti);

			const catalystDecoded = decodeJwt(catalystToken);
			expect(decoded1.sub).toBe(catalystDecoded.sub);
			expect(decoded2.sub).toBe(catalystDecoded.sub);

			expect(decoded1.claims).toContain(channelIds[0]);
			expect(decoded2.claims).toContain(channelIds[1]);

			expect(decoded1.claims).not.toContain(channelIds[1]);
			expect(decoded2.claims).not.toContain(channelIds[0]);
		});
	});

	describe('Error Handling in Token Splitting', () => {
		it('should handle catalyst token with empty claims array', async () => {
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

			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(catalystToken.token);

			expect(splitResponse.success).toBe(false);
			expect(splitResponse.error).toBeDefined();
		});

		it('should handle signSingleUseJWT with empty claim on catalyst token', async () => {
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
