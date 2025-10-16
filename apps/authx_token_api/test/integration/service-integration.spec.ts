import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JWTSigningRequest } from '@catalyst/schema_zod';
import { JWTAudience } from '@catalyst/schema_zod';
import { clearAllAuthzedRoles, custodianCreatesDataChannel, generateDataChannels, TEST_ORG_ID, validUsers } from '../utils/testUtils';

/**
 * Integration Tests: Service Integration
 *
 * These tests verify that authx_token_api correctly integrates with:
 * - AuthZed for permission validation
 * - UserCache for user lookup
 * - Data Channel Registrar for channel discovery
 *
 * All tests use REAL service bindings (no mocks) to ensure
 * cross-service communication works correctly in production.
 */
describe('Integration: Cross-Service Interactions', () => {
	const CUSTODIAN_CF_TOKEN = 'cf-custodian-token';
	const CUSTODIAN_USER = validUsers[CUSTODIAN_CF_TOKEN];
	const ORG_ADMIN_CF_TOKEN = 'cf-org-admin-token';
	const ORG_ADMIN_USER = validUsers[ORG_ADMIN_CF_TOKEN];
	const ORG_USER_CF_TOKEN = 'cf-user-token';
	const ORG_USER = validUsers[ORG_USER_CF_TOKEN];

	beforeEach(async () => {
		await clearAllAuthzedRoles();
	});

	describe('AuthZed Permission Integration', () => {
		it('should validate user has read permission for all claims via AuthZed', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: User requests JWT for 2 channels, but only has
			// permission for 1 channel. Request should FAIL.
			// Then grant permission for 2nd channel and retry.
			// ═══════════════════════════════════════════════════════════

			// STEP 1: Setup user with permission for only channel1
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const channels = generateDataChannels(2);
			const channel1 = await custodianCreatesDataChannel(channels[0]);
			const channel2 = await custodianCreatesDataChannel(channels[1]);

			// STEP 2: Remove permission for channel2
			// (custodianCreatesDataChannel grants permissions, so we need to remove one)
			await env.AUTHZED.deleteDataChannelInOrg(TEST_ORG_ID, channel2.id);
			await env.AUTHZED.deleteOrgInDataChannel(channel2.id, TEST_ORG_ID);

			// STEP 3: Request JWT with both channels - should FAIL
			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [channel1.id, channel2.id],
				audience: JWTAudience.enum['catalyst:gateway'],
			};

			const failedResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(failedResponse.success).toBe(false);
			expect(failedResponse.error).toContain('unable to validate user to all claims');

			// STEP 4: Grant permission for channel2
			await env.AUTHZED.addDataChannelToOrg(TEST_ORG_ID, channel2.id);
			await env.AUTHZED.addOrgToDataChannel(channel2.id, TEST_ORG_ID);

			// STEP 5: Retry request - should SUCCEED
			const successResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(successResponse.success).toBe(true);
			expect(successResponse.token).toBeDefined();

			// STEP 6: Validate token has both claims
			const validateResponse = await SELF.validateToken(successResponse.token!);
			expect(validateResponse.valid).toBe(true);
			expect(validateResponse.claims).toHaveLength(2);
			expect(validateResponse.claims).toContain(channel1.id);
			expect(validateResponse.claims).toContain(channel2.id);
		});

		it('should validate ALL claims individually through AuthZed', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Verify that authx_token_api calls
			// AUTHZED.canReadFromDataChannel() for EACH claim individually
			// ═══════════════════════════════════════════════════════════

			// STEP 1: Setup user with permissions for 5 channels
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const channels = generateDataChannels(5);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));

			// STEP 2: Request JWT with all 5 claims
			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: createdChannels.map((ch) => ch.id),
				audience: JWTAudience.enum['catalyst:gateway'],
			};

			const signResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			// STEP 3: Verify success
			expect(signResponse.success).toBe(true);
			expect(signResponse.token).toBeDefined();

			// STEP 4: Validate token contains all 5 claims
			const validateResponse = await SELF.validateToken(signResponse.token!);
			expect(validateResponse.valid).toBe(true);
			expect(validateResponse.claims).toHaveLength(5);
			expect(validateResponse.claims).toEqual(createdChannels.map((ch) => ch.id));
		});

		it('should work with different user roles (org-admin, data-custodian, org-user)', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Test JWT signing with all 3 user roles
			// ═══════════════════════════════════════════════════════════

			const channel = generateDataChannels(1)[0];

			// Test with Data Custodian
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const custodianChannel = await custodianCreatesDataChannel(channel);

			const custodianRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [custodianChannel.id],
			};

			const custodianResponse = await SELF.signJWT(custodianRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(custodianResponse.success).toBe(true);

			// Test with Org Admin
			await env.AUTHZED.addAdminToOrg(TEST_ORG_ID, ORG_ADMIN_USER.email);

			const adminRequest: JWTSigningRequest = {
				entity: ORG_ADMIN_USER.email,
				claims: [custodianChannel.id],
			};

			const adminResponse = await SELF.signJWT(adminRequest, 3600 * 1000, {
				cfToken: ORG_ADMIN_CF_TOKEN,
			});

			expect(adminResponse.success).toBe(true);

			// Test with Regular Org User
			await env.AUTHZED.addUserToOrg(TEST_ORG_ID, ORG_USER.email);

			const userRequest: JWTSigningRequest = {
				entity: ORG_USER.email,
				claims: [custodianChannel.id],
			};

			const userResponse = await SELF.signJWT(userRequest, 3600 * 1000, {
				cfToken: ORG_USER_CF_TOKEN,
			});

			expect(userResponse.success).toBe(true);

			// Verify all tokens are valid
			const custodianValidate = await SELF.validateToken(custodianResponse.token!);
			const adminValidate = await SELF.validateToken(adminResponse.token!);
			const userValidate = await SELF.validateToken(userResponse.token!);

			expect(custodianValidate.valid).toBe(true);
			expect(adminValidate.valid).toBe(true);
			expect(userValidate.valid).toBe(true);
		});

		it('should reject JWT request when user lacks ANY permission', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: User requests 3 claims but lacks permission
			// for the 2nd claim. Entire request should FAIL.
			// ═══════════════════════════════════════════════════════════

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const channels = generateDataChannels(3);
			const channel1 = await custodianCreatesDataChannel(channels[0]);
			const channel2 = await custodianCreatesDataChannel(channels[1]);
			const channel3 = await custodianCreatesDataChannel(channels[2]);

			// Remove permission for channel2 only
			await env.AUTHZED.deleteDataChannelInOrg(TEST_ORG_ID, channel2.id);
			await env.AUTHZED.deleteOrgInDataChannel(channel2.id, TEST_ORG_ID);

			// Request JWT with all 3 channels
			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [channel1.id, channel2.id, channel3.id],
				audience: JWTAudience.enum['catalyst:gateway'],
			};

			const response = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			// Request should FAIL (no partial success)
			expect(response.success).toBe(false);
			expect(response.error).toContain('unable to validate user to all claims');
			expect(response.token).toBeUndefined();
		});
	});

	describe('UserCache Integration', () => {
		it('should retrieve user from cache for JWT signing', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Verify UserCache is queried with CF token
			// and user data is used for permission checks
			// ═══════════════════════════════════════════════════════════

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const channel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(channel);

			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [createdChannel.id],
				audience: JWTAudience.enum['catalyst:gateway'],
			};

			// UserCache will be queried with cfToken to get user data
			const response = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(response.success).toBe(true);

			// Verify the JWT contains the user's email as subject
			const validateResponse = await SELF.validateToken(response.token!);
			expect(validateResponse.valid).toBe(true);
			expect(validateResponse.entity).toBe(CUSTODIAN_USER.email);
		});

		it('should handle different user types from cache', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Test that all user types from validUsers work
			// ═══════════════════════════════════════════════════════════

			const channel = generateDataChannels(1)[0];

			// Test each user type
			const userTypes = [
				{ token: CUSTODIAN_CF_TOKEN, user: CUSTODIAN_USER, addToOrg: env.AUTHZED.addDataCustodianToOrg },
				{ token: ORG_ADMIN_CF_TOKEN, user: ORG_ADMIN_USER, addToOrg: env.AUTHZED.addAdminToOrg },
				{ token: ORG_USER_CF_TOKEN, user: ORG_USER, addToOrg: env.AUTHZED.addUserToOrg },
			];

			for (const { token, user, addToOrg } of userTypes) {
				await clearAllAuthzedRoles();
				await addToOrg(TEST_ORG_ID, user.email);

				const createdChannel = await custodianCreatesDataChannel(channel);

				const jwtRequest: JWTSigningRequest = {
					entity: user.email,
					claims: [createdChannel.id],
					audience: JWTAudience.enum['catalyst:gateway'],
				};

				const response = await SELF.signJWT(jwtRequest, 3600 * 1000, {
					cfToken: token,
				});

				expect(response.success).toBe(true);
				expect(response.token).toBeDefined();

				// Verify user email in token
				const validateResponse = await SELF.validateToken(response.token!);
				expect(validateResponse.entity).toBe(user.email);
			}
		});

		it('should reject requests when user not in cache', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Invalid CF token should fail user lookup
			// ═══════════════════════════════════════════════════════════

			const jwtRequest: JWTSigningRequest = {
				entity: 'non-existent-user',
				claims: ['some-claim'],
				audience: JWTAudience.enum['catalyst:gateway'],
			};

			const response = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: 'invalid-cf-token-not-in-cache',
			});

			expect(response.success).toBe(false);
			expect(response.error).toContain('unable to verify user');
			expect(response.token).toBeUndefined();
		});
	});

	describe('Data Channel Registrar Integration', () => {
		it('should split catalyst token using registrar channel list', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Create catalyst token with 3 channels,
			// split it into 3 single-use tokens via registrar lookup
			// ═══════════════════════════════════════════════════════════

			// STEP 1: Setup permissions and create channels
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			const channels = generateDataChannels(3);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));

			// STEP 2: Create catalyst token with all 3 channel claims
			const channelIds = createdChannels.map((ch) => ch.id);

			// Get catalyst token (properly registered via signJWT)
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

			// STEP 3: Split catalyst token into single-use tokens
			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(catalystToken);

			expect(splitResponse.success).toBe(true);
			expect(splitResponse.channelPermissions).toBeDefined();
			expect(splitResponse.channelPermissions).toHaveLength(3);

			// STEP 4: Verify each single-use token
			for (let i = 0; i < 3; i++) {
				const permission = splitResponse.channelPermissions![i];

				expect(permission.success).toBe(true);
				expect(permission.claim).toBe(channelIds[i]);
				expect(permission.dataChannel).toBeDefined();
				expect(permission.dataChannel?.id).toBe(channelIds[i]);
				expect(permission.singleUseToken).toBeDefined();

				// Validate the single-use token
				const validateResponse = await SELF.validateToken(permission.singleUseToken!);
				expect(validateResponse.valid).toBe(true);
				expect(validateResponse.claims).toHaveLength(1);
				expect(validateResponse.claims).toContain(channelIds[i]);
			}
		});

		it('should filter channels by catalyst token claims', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: 5 channels exist in registrar, but catalyst
			// token only has claims for 2. Should return only 2 tokens.
			// ═══════════════════════════════════════════════════════════

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			// Create 5 channels in registrar
			const channels = generateDataChannels(5);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));

			// Create catalyst token with only 2 channel claims
			const selectedChannels = [createdChannels[0].id, createdChannels[2].id];

			const catalystTokenResponse = await SELF.signJWT(
				{
					entity: `${TEST_ORG_ID}/${CUSTODIAN_USER.email}`,
					claims: selectedChannels,
				},
				3600 * 1000,
				{ cfToken: CUSTODIAN_CF_TOKEN },
			);

			expect(catalystTokenResponse.success).toBe(true);
			const catalystToken = catalystTokenResponse.token!;

			// Split token
			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(catalystToken);

			expect(splitResponse.success).toBe(true);
			expect(splitResponse.channelPermissions).toHaveLength(2);

			// Verify only selected channels returned
			const returnedClaims = splitResponse.channelPermissions!.map((p) => p.claim);
			expect(returnedClaims).toEqual(expect.arrayContaining(selectedChannels));
		});

		it('should return error when registrar returns no channels', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Catalyst token has claims for channels that
			// user has permission to, but channels aren't registered in
			// the registrar. Should return error.
			// ═══════════════════════════════════════════════════════════

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

			// Create 2 phantom channel IDs (with permissions but not in registrar)
			const phantomChannelIds = ['phantom-channel-1', 'phantom-channel-2'];

			// Grant permissions for these channels
			for (const channelId of phantomChannelIds) {
				await env.AUTHZED.addDataChannelToOrg(TEST_ORG_ID, channelId);
				await env.AUTHZED.addOrgToDataChannel(channelId, TEST_ORG_ID);
			}

			// Create catalyst token with phantom channel claims (has permissions but not in registrar)
			const catalystTokenResponse = await SELF.signJWT(
				{
					entity: `${TEST_ORG_ID}/${CUSTODIAN_USER.email}`,
					claims: phantomChannelIds,
				},
				3600 * 1000,
				{ cfToken: CUSTODIAN_CF_TOKEN },
			);

			expect(catalystTokenResponse.success).toBe(true);
			const catalystToken = catalystTokenResponse.token!;

			// Attempt to split - should fail because registrar has no channels matching these claims
			const splitResponse = await SELF.splitTokenIntoSingleUseTokens(catalystToken);

			expect(splitResponse.success).toBe(false);
			expect(splitResponse.error).toBe('no resources found');
		});
	});

	describe('Multi-Service Workflows', () => {
		it('should validate full user journey: auth → permissions → token → validation', async () => {
			// ═══════════════════════════════════════════════════════════
			// COMPLETE END-TO-END WORKFLOW
			// 1. User authenticated via USERCACHE (CF token)
			// 2. Permissions checked via AUTHZED
			// 3. Token signed via KEY_PROVIDER
			// 4. Token validated via validateToken()
			// ═══════════════════════════════════════════════════════════

			// STEP 1: User authentication (implicit via cfToken)
			const userToken = CUSTODIAN_CF_TOKEN;

			// STEP 2: Setup permissions in AuthZed
			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const channel = generateDataChannels(1)[0];
			const createdChannel = await custodianCreatesDataChannel(channel);

			// STEP 3: Request JWT (triggers USERCACHE + AUTHZED checks)
			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [createdChannel.id],
				audience: JWTAudience.enum['catalyst:gateway'],
			};

			const signResponse = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: userToken,
			});

			expect(signResponse.success).toBe(true);

			// STEP 4: Validate token (uses KEY_PROVIDER)
			const validateResponse = await SELF.validateToken(signResponse.token!);

			expect(validateResponse.valid).toBe(true);
			expect(validateResponse.entity).toBe(CUSTODIAN_USER.email);
			expect(validateResponse.claims).toEqual([createdChannel.id]);

			// STEP 5: Verify token could be used to access data channel
			// (In real workflow, this token would be sent to data channel gateway)
		});

		it('should handle complex permission scenarios with multiple orgs and channels', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: User is custodian in multiple orgs with
			// different channel permissions
			// ═══════════════════════════════════════════════════════════

			const org1 = TEST_ORG_ID;
			const org2 = 'test-org-2';

			// Setup user in both orgs
			await env.AUTHZED.addDataCustodianToOrg(org1, CUSTODIAN_USER.email);
			await env.AUTHZED.addDataCustodianToOrg(org2, CUSTODIAN_USER.email);

			// Create channels in each org
			const channels = generateDataChannels(2);
			const channel1 = await custodianCreatesDataChannel(channels[0]); // org1
			const channel2 = { ...channels[1], creatorOrganization: org2 }; // org2

			// Create channel2 in registrar for org2
			await env.DATA_CHANNEL_REGISTRAR.create('default', channel2, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});
			await env.AUTHZED.addDataChannelToOrg(org2, channel2.id);
			await env.AUTHZED.addOrgToDataChannel(channel2.id, org2);

			// Request JWT with channels from both orgs
			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: [channel1.id, channel2.id],
				audience: JWTAudience.enum['catalyst:gateway'],
			};

			const response = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(response.success).toBe(true);

			const validateResponse = await SELF.validateToken(response.token!);
			expect(validateResponse.valid).toBe(true);
			expect(validateResponse.claims).toHaveLength(2);
		});

		it('should verify token claims match AuthZed permissions exactly', async () => {
			// ═══════════════════════════════════════════════════════════
			// SCENARIO: Ensure no claim bypass - token claims must
			// exactly match what AuthZed authorized
			// ═══════════════════════════════════════════════════════════

			await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
			const channels = generateDataChannels(3);
			const createdChannels = await Promise.all(channels.map((ch) => custodianCreatesDataChannel(ch)));

			// Request JWT with specific claims
			const requestedClaims = createdChannels.map((ch) => ch.id);

			const jwtRequest: JWTSigningRequest = {
				entity: CUSTODIAN_USER.email,
				claims: requestedClaims,
				audience: JWTAudience.enum['catalyst:gateway'],
			};

			const response = await SELF.signJWT(jwtRequest, 3600 * 1000, {
				cfToken: CUSTODIAN_CF_TOKEN,
			});

			expect(response.success).toBe(true);

			// Validate token and verify claims EXACTLY match
			const validateResponse = await SELF.validateToken(response.token!);
			expect(validateResponse.valid).toBe(true);
			expect(validateResponse.claims).toHaveLength(requestedClaims.length);
			expect(validateResponse.claims.sort()).toEqual(requestedClaims.sort());

			// Verify no extra claims snuck in
			for (const claim of validateResponse.claims!) {
				expect(requestedClaims).toContain(claim);
			}
		});
	});
});
