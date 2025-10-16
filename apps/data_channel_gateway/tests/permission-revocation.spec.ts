/**
 * Test Suite: Permission Revocation Security
 *
 * This test suite validates that JWTs are properly invalidated when:
 * - Partnerships are removed between organizations
 * - Users are removed from organizations
 * - Channels are disabled
 *
 * Expected Behavior:
 * - Gateway always returns HTTP 200 (never returns error status codes)
 * - When channel access is revoked, that channel's schema is excluded from stitching
 * - Queries for fields from inaccessible channels return GraphQL validation errors
 * - Response format: { "data": null, "errors": [{ message: "Cannot query field...", extensions: { code: "GRAPHQL_VALIDATION_FAILED" } }] }
 * - Only accessible channels have their schemas stitched into the gateway
 */

import { DataChannel } from '@catalyst/schemas';
import { env, fetchMock, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TEST_USER, TEST_ORG, generateCatalystToken, createMockGraphqlEndpoint } from './testUtils';

// Second organization for partnership testing
const PARTNER_ORG = 'partner_org';
const PARTNER_USER = 'partner_user@mail.com';

// Test data channels
const OWNER_CHANNEL: DataChannel = {
    id: 'owner-channel-001',
    name: 'Owner Data Channel',
    endpoint: 'http://localhost:9001/graphql',
    accessSwitch: true,
    description: 'Channel owned by TEST_ORG',
    creatorOrganization: TEST_ORG,
};

const SHARED_CHANNEL: DataChannel = {
    id: 'shared-channel-001',
    name: 'Shared Data Channel',
    endpoint: 'http://localhost:9002/graphql',
    accessSwitch: true,
    description: 'Channel shared between orgs',
    creatorOrganization: TEST_ORG,
};

const DELETABLE_CHANNEL: DataChannel = {
    id: 'deletable-channel-001',
    name: 'Deletable Channel',
    endpoint: 'http://localhost:9103/graphql',
    accessSwitch: true,
    description: 'Channel that will be deleted during testing',
    creatorOrganization: TEST_ORG,
};

const DISABLED_CHANNEL: DataChannel = {
    id: 'disabled-channel-001',
    name: 'Disabled Channel',
    endpoint: 'http://localhost:9104/graphql',
    accessSwitch: false, // Pre-disabled
    description: 'Channel that starts disabled',
    creatorOrganization: TEST_ORG,
};

// Additional test users for multi-user scenarios
const USER_B = 'user_b@mail.com';
const USER_C = 'user_c@mail.com';

describe('Permission Revocation Security Tests', () => {
    beforeEach(async () => {
        // Clean up any leftover state first
        try {
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(TEST_ORG, PARTNER_USER);
        } catch {
            // Ignore if doesn't exist
        }

        // Set up organizations
        await env.AUTHX_AUTHZED_API.addUserToOrg(TEST_ORG, TEST_USER);
        await env.AUTHX_AUTHZED_API.addUserToOrg(TEST_ORG, USER_B);
        await env.AUTHX_AUTHZED_API.addUserToOrg(TEST_ORG, USER_C);
        await env.AUTHX_AUTHZED_API.addUserToOrg(PARTNER_ORG, PARTNER_USER);

        // Register channels in Durable Object
        const registrarId = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
        const registrarStub = env.DATA_CHANNEL_REGISTRAR_DO.get(registrarId);
        await registrarStub.update(OWNER_CHANNEL);
        await registrarStub.update(SHARED_CHANNEL);
        await registrarStub.update(DELETABLE_CHANNEL);
        await registrarStub.update(DISABLED_CHANNEL);

        // Set up mock GraphQL endpoints
        fetchMock.activate();
        fetchMock.disableNetConnect();

        createMockGraphqlEndpoint(OWNER_CHANNEL.endpoint, `type Query { ownerData: String! }`, {
            ownerData: 'sensitive-owner-data',
        });

        createMockGraphqlEndpoint(SHARED_CHANNEL.endpoint, `type Query { sharedData: String! }`, {
            sharedData: 'sensitive-shared-data',
        });

        createMockGraphqlEndpoint(DELETABLE_CHANNEL.endpoint, `type Query { deletableData: String! }`, {
            deletableData: 'data-to-be-deleted',
        });

        createMockGraphqlEndpoint(DISABLED_CHANNEL.endpoint, `type Query { disabledData: String! }`, {
            disabledData: 'disabled-data',
        });
    });

    afterEach(async () => {
        // Clean up channels
        const registrarId = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
        const registrarStub = env.DATA_CHANNEL_REGISTRAR_DO.get(registrarId);

        try {
            await registrarStub.delete(OWNER_CHANNEL.id);
            await registrarStub.delete(SHARED_CHANNEL.id);
            await registrarStub.delete(DELETABLE_CHANNEL.id);
            await registrarStub.delete(DISABLED_CHANNEL.id);
        } catch (error) {
            console.warn('Channel cleanup error (expected if already deleted):', error);
        }

        // Clean up AuthZed relationships
        try {
            await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel(OWNER_CHANNEL.id, TEST_ORG);
            await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel(SHARED_CHANNEL.id, TEST_ORG);
            await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel(SHARED_CHANNEL.id, PARTNER_ORG);
            await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel(DELETABLE_CHANNEL.id, TEST_ORG);
            await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg(TEST_ORG, OWNER_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg(TEST_ORG, SHARED_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg(PARTNER_ORG, SHARED_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg(TEST_ORG, DELETABLE_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(TEST_ORG, TEST_USER);
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(TEST_ORG, USER_B);
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(TEST_ORG, USER_C);
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(TEST_ORG, PARTNER_USER); // Clean up in case it was added
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(PARTNER_ORG, PARTNER_USER);
            await env.AUTHX_AUTHZED_API.deletePartnerInOrg(TEST_ORG, PARTNER_ORG);
        } catch (error) {
            // Ignore cleanup errors
            console.warn('AuthZed cleanup error (expected):', error);
        }

        fetchMock.deactivate();
        // Don't assert pending interceptors - when permissions are correctly denied,
        // the mock GraphQL endpoints are never called (which is the correct behavior)
        fetchMock.enableNetConnect();
    });

    describe('Partnership Removal Scenario', () => {
        it('should DENY access when partnership is removed AFTER JWT creation', async () => {
            // 1. Set up channel ownership (TEST_ORG owns SHARED_CHANNEL)
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, SHARED_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(SHARED_CHANNEL.id, TEST_ORG);

            // 2. Establish partnership: TEST_ORG shares with PARTNER_ORG
            await env.AUTHX_AUTHZED_API.addPartnerToOrg(TEST_ORG, PARTNER_ORG);

            // 3. Verify PARTNER_USER can read SHARED_CHANNEL via partnership
            const canReadBefore = await env.AUTHX_AUTHZED_API.canReadFromDataChannel(SHARED_CHANNEL.id, PARTNER_USER);
            expect(canReadBefore).toBe(true); // Partnership grants access

            // 4. PARTNER_USER creates a JWT with SHARED_CHANNEL claim
            const partnerToken = await generateCatalystToken(PARTNER_ORG, [SHARED_CHANNEL.id], undefined, PARTNER_USER);
            expect(partnerToken).toBeDefined();

            // 5. Verify token works BEFORE partnership removal
            const responseBefore = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${partnerToken}`,
                },
                body: JSON.stringify({
                    query: `{ sharedData }`,
                }),
            });

            expect(responseBefore.status).toBe(200);
            const dataBefore = await responseBefore.json();
            expect(dataBefore.data?.sharedData).toBe('sensitive-shared-data'); // Access granted

            // 6. Admin removes partnership
            await env.AUTHX_AUTHZED_API.deletePartnerInOrg(TEST_ORG, PARTNER_ORG);

            // Wait for AuthZed to propagate the deletion
            // AuthZed uses fullyConsistent:true, but we still need a brief pause
            await new Promise((resolve) => setTimeout(resolve, 500));

            // 6.5 Check which organizations are linked to the channel
            const orgsInChannel = await env.AUTHX_AUTHZED_API.listOrgsInDataChannel(SHARED_CHANNEL.id);
            console.log('Organizations linked to SHARED_CHANNEL:', orgsInChannel);

            // 6.6 Verify the partnership was actually deleted
            const partnersAfterDeletion = await env.AUTHX_AUTHZED_API.listPartnersInOrg(TEST_ORG, PARTNER_ORG);
            console.log('partnersAfterDeletion:', partnersAfterDeletion);
            expect(partnersAfterDeletion.length).toBe(0); // Partnership should be gone

            // 6.7 Check which orgs PARTNER_USER belongs to
            const partnerUserInPartnerOrg = await env.AUTHX_AUTHZED_API.listUsersInOrg(PARTNER_ORG, PARTNER_USER);
            console.log('PARTNER_USER in PARTNER_ORG:', partnerUserInPartnerOrg);

            const partnerUserInTestOrg = await env.AUTHX_AUTHZED_API.listUsersInOrg(TEST_ORG, PARTNER_USER);
            console.log('PARTNER_USER in TEST_ORG:', partnerUserInTestOrg);

            // 6.8 Verify AuthZed now denies access
            const canReadAfterDeletion = await env.AUTHX_AUTHZED_API.canReadFromDataChannel(
                SHARED_CHANNEL.id,
                PARTNER_USER
            );
            console.log('canReadAfterDeletion:', canReadAfterDeletion);
            expect(canReadAfterDeletion).toBe(false); // Should be denied now

            // 7. Attempt to use the SAME JWT after partnership removal
            const responseAfter = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${partnerToken}`, // Same token!
                },
                body: JSON.stringify({
                    query: `{ sharedData }`,
                }),
            });

            console.log('Response status after revocation:', responseAfter.status);
            const dataAfter = await responseAfter.json();
            console.log('Response body after revocation:', JSON.stringify(dataAfter, null, 2));
            expect(responseAfter.status).toBe(200);
            // After revocation, the channel schema is excluded, so queries return validation errors
            expect(dataAfter.errors).toBeDefined();
            expect(dataAfter.errors[0].message).toContain('Cannot query field');
            expect(dataAfter.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
        });

        it('should DENY single-use token creation when partnership is removed', async () => {
            // Similar to above, but tests signSingleUseJWT directly
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, SHARED_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(SHARED_CHANNEL.id, TEST_ORG);
            await env.AUTHX_AUTHZED_API.addPartnerToOrg(TEST_ORG, PARTNER_ORG);

            const partnerToken = await generateCatalystToken(PARTNER_ORG, [SHARED_CHANNEL.id], undefined, PARTNER_USER);

            // Verify single-use token creation works WITH partnership
            const singleUseBefore = await env.AUTHX_TOKEN_API.signSingleUseJWT(
                SHARED_CHANNEL.id,
                { catalystToken: partnerToken },
                'default'
            );
            expect(singleUseBefore.success).toBe(true);

            // Remove partnership
            await env.AUTHX_AUTHZED_API.deletePartnerInOrg(TEST_ORG, PARTNER_ORG);

            // Wait briefly for AuthZed to propagate the deletion
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Try to create single-use token AFTER revocation
            const singleUseAfter = await env.AUTHX_TOKEN_API.signSingleUseJWT(
                SHARED_CHANNEL.id,
                { catalystToken: partnerToken },
                'default'
            );

            expect(singleUseAfter.success).toBe(false);
            expect(singleUseAfter.error).toMatch(/permission|denied|access/i);
        });
    });

    describe('User Removal Scenario', () => {
        it('should DENY access when user is removed from org AFTER JWT creation', async () => {
            // 1. Set up channel access
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, OWNER_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(OWNER_CHANNEL.id, TEST_ORG);

            // 2. TEST_USER creates JWT
            const userToken = await generateCatalystToken(TEST_ORG, [OWNER_CHANNEL.id], undefined, TEST_USER);

            // 3. Verify access works before removal
            const responseBefore = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ query: `{ ownerData }` }),
            });

            expect(responseBefore.status).toBe(200);
            const dataBefore = await responseBefore.json();
            expect(dataBefore.data?.ownerData).toBe('sensitive-owner-data');

            // 4. Admin removes user from organization
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(TEST_ORG, TEST_USER);

            // 5. Verify AuthZed now denies access
            const canReadAfter = await env.AUTHX_AUTHZED_API.canReadFromDataChannel(OWNER_CHANNEL.id, TEST_USER);
            expect(canReadAfter).toBe(false);

            // 6. Try to use old JWT after user removal
            const responseAfter = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ query: `{ ownerData }` }),
            });

            expect(responseAfter.status).toBe(200);
            const dataAfter = await responseAfter.json();
            // After user removal, the channel schema is excluded, so queries return validation errors
            expect(dataAfter.errors).toBeDefined();
            expect(dataAfter.errors[0].message).toContain('Cannot query field');
            expect(dataAfter.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
        });

        it('should DENY access when user with MULTIPLE roles is removed from org', async () => {
            // This test ensures deleteUserFromOrg removes ALL roles (user, data_custodian, admin)
            // Previously, deleteUserFromOrg only removed the 'user' role, leaving other roles intact

            // 1. Set up channel access
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, OWNER_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(OWNER_CHANNEL.id, TEST_ORG);

            // 2. Add USER_B with BOTH user and data_custodian roles
            await env.AUTHX_AUTHZED_API.addUserToOrg(TEST_ORG, USER_B);
            await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(TEST_ORG, USER_B);

            // 3. Verify USER_B has both roles
            const rolesBefore = await env.AUTHX_AUTHZED_API.listUsersInOrg(TEST_ORG, USER_B);
            expect(rolesBefore.length).toBeGreaterThanOrEqual(2); // Should have at least user + data_custodian

            // 4. Verify USER_B can read the channel (because they have data_custodian role)
            const canReadBefore = await env.AUTHX_AUTHZED_API.canReadFromDataChannel(OWNER_CHANNEL.id, USER_B);
            expect(canReadBefore).toBe(true);

            // 5. USER_B creates JWT
            const userToken = await generateCatalystToken(TEST_ORG, [OWNER_CHANNEL.id], undefined, USER_B);

            // 6. Verify access works before removal
            const responseBefore = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ query: `{ ownerData }` }),
            });

            expect(responseBefore.status).toBe(200);
            const dataBefore = await responseBefore.json();
            expect(dataBefore.data?.ownerData).toBe('sensitive-owner-data');

            // 7. Admin removes user from organization (should remove ALL roles)
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(TEST_ORG, USER_B);

            // 8. Verify ALL roles are removed
            const rolesAfter = await env.AUTHX_AUTHZED_API.listUsersInOrg(TEST_ORG, USER_B);
            expect(rolesAfter.length).toBe(0); // NO roles should remain

            // 9. Verify AuthZed now denies access (this would have FAILED before the fix)
            const canReadAfter = await env.AUTHX_AUTHZED_API.canReadFromDataChannel(OWNER_CHANNEL.id, USER_B);
            expect(canReadAfter).toBe(false);

            // 10. Try to use old JWT after user removal
            const responseAfter = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ query: `{ ownerData }` }),
            });

            expect(responseAfter.status).toBe(200);
            const dataAfter = await responseAfter.json();
            // After user removal, the channel schema is excluded, so queries return validation errors
            expect(dataAfter.errors).toBeDefined();
            expect(dataAfter.errors[0].message).toContain('Cannot query field');
            expect(dataAfter.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
        });
    });

    describe('Channel Disable Scenario', () => {
        it('should DENY access when channel is disabled AFTER JWT creation', async () => {
            // 1. Set up enabled channel
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, OWNER_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(OWNER_CHANNEL.id, TEST_ORG);

            // 2. Create JWT while channel is enabled
            const token = await generateCatalystToken(TEST_ORG, [OWNER_CHANNEL.id], undefined, TEST_USER);

            // 3. Verify access works
            const responseBefore = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: `{ ownerData }` }),
            });

            expect(responseBefore.status).toBe(200);

            // 4. Disable channel via accessSwitch
            const registrarId = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
            const registrarStub = env.DATA_CHANNEL_REGISTRAR_DO.get(registrarId);
            await registrarStub.update({
                ...OWNER_CHANNEL,
                accessSwitch: false, // Disable!
            });

            // 5. Try to use JWT after channel disabled
            const responseAfter = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: `{ ownerData }` }),
            });

            expect(responseAfter.status).toBe(200);
            const dataAfter = await responseAfter.json();
            // After channel is disabled, the schema is excluded, so queries return validation errors
            expect(dataAfter.errors).toBeDefined();
            expect(dataAfter.errors[0].message).toContain('Cannot query field');
            expect(dataAfter.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
        });
    });

    describe('Manual Token Revocation Scenario', () => {
        it('should DENY access when JWT is manually revoked', async () => {
            // 1. Set up channel
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, OWNER_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(OWNER_CHANNEL.id, TEST_ORG);

            // 2. Create JWT and extract jti
            const token = await generateCatalystToken(TEST_ORG, [OWNER_CHANNEL.id], undefined, TEST_USER);

            // 3. Verify access works
            const responseBefore = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: `{ ownerData }` }),
            });

            expect(responseBefore.status).toBe(200);

            // 4. Decode JWT to get jti
            const { jwtId } = await env.AUTHX_TOKEN_API.validateToken(token, 'default');
            expect(jwtId).toBeDefined();

            // 5. Manually revoke token
            const revoked = await env.ISSUED_JWT_REGISTRY.addToRevocationList(
                { cfToken: 'cf-test-token' },
                jwtId!,
                'default'
            );
            expect(revoked).toBe(true);

            // 6. Try to use revoked JWT
            const responseAfter = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: `{ ownerData }` }),
            });

            expect(responseAfter.status).toBe(200);
            const dataAfter = await responseAfter.json();
            // After manual revocation, the channel schema is excluded, so queries return validation errors
            expect(dataAfter.errors).toBeDefined();
            expect(dataAfter.errors[0].message).toContain('Cannot query field');
            expect(dataAfter.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
        });
    });

    describe('Multiple Claims with Partial Revocation', () => {
        it('should only allow access to channels user still has permission for', async () => {
            // 1. Set up two channels - one owned, one via partnership
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, OWNER_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(OWNER_CHANNEL.id, TEST_ORG);
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, SHARED_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(SHARED_CHANNEL.id, TEST_ORG);
            await env.AUTHX_AUTHZED_API.addPartnerToOrg(TEST_ORG, PARTNER_ORG);

            // 2. Partner user creates JWT with BOTH channels
            const partnerToken = await generateCatalystToken(
                PARTNER_ORG,
                [OWNER_CHANNEL.id, SHARED_CHANNEL.id],
                undefined,
                PARTNER_USER
            );

            // 3. Remove partnership (revokes SHARED_CHANNEL but not OWNER_CHANNEL)
            // Wait, partner org doesn't own OWNER_CHANNEL either!
            // Let's add OWNER_CHANNEL to PARTNER_ORG first
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(PARTNER_ORG, OWNER_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(OWNER_CHANNEL.id, PARTNER_ORG);

            // 4. Now remove partnership - SHARED_CHANNEL becomes inaccessible
            await env.AUTHX_AUTHZED_API.deletePartnerInOrg(TEST_ORG, PARTNER_ORG);

            // Wait briefly for AuthZed to propagate the deletion
            await new Promise((resolve) => setTimeout(resolve, 100));

            // 5. Try to access SHARED_CHANNEL (should be omitted from schema)
            const sharedResponse = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${partnerToken}`,
                },
                body: JSON.stringify({ query: `{ sharedData }` }),
            });

            expect(sharedResponse.status).toBe(200);
            const sharedData = await sharedResponse.json();
            // After partnership removal, SHARED_CHANNEL schema is excluded, so queries return validation errors
            expect(sharedData.errors).toBeDefined();
            expect(sharedData.errors[0].message).toContain('Cannot query field');
            expect(sharedData.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');

            // 6. Try to access OWNER_CHANNEL (should still succeed since PARTNER_ORG owns it directly)
            const ownerResponse = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${partnerToken}`,
                },
                body: JSON.stringify({ query: `{ ownerData }` }),
            });

            expect(ownerResponse.status).toBe(200);
            const ownerData = await ownerResponse.json();
            // OWNER_CHANNEL should still be accessible since PARTNER_ORG owns it directly
            expect(ownerData.data?.ownerData).toBeDefined();
        });
    });

    describe('Channel Deleted While JWT Exists', () => {
        it('should gracefully deny access when channel is completely deleted', async () => {
            // Setup channel with permissions
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, DELETABLE_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(DELETABLE_CHANNEL.id, TEST_ORG);

            // Create JWT for channel
            const token = await generateCatalystToken(TEST_ORG, [DELETABLE_CHANNEL.id], undefined, TEST_USER);

            // Verify token works before deletion
            const responseBefore = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: `{ deletableData }` }),
            });

            expect(responseBefore.status).toBe(200);

            // DELETE CHANNEL: Complete removal from system
            const registrarId = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
            const registrarStub = env.DATA_CHANNEL_REGISTRAR_DO.get(registrarId);

            await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel(DELETABLE_CHANNEL.id, TEST_ORG);
            await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg(TEST_ORG, DELETABLE_CHANNEL.id);
            const deleted = await registrarStub.delete(DELETABLE_CHANNEL.id);
            expect(deleted).toBe(true);

            // Try to use JWT after channel deletion
            const responseAfter = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: `{ deletableData }` }),
            });

            const dataAfter = await responseAfter.json();
            console.log('Response after channel deletion:', JSON.stringify(dataAfter, null, 2));

            expect(responseAfter.status).toBe(200);
            // After channel deletion, the schema is excluded, so queries return validation errors
            expect(dataAfter.errors).toBeDefined();
            expect(dataAfter.errors[0].message).toContain('Cannot query field');
            expect(dataAfter.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
        });
    });

    describe('Organization Deleted/Deactivated', () => {
        it('should deny access when user is removed from organization', async () => {
            // Setup: Partner org shares channel with TEST_ORG
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(PARTNER_ORG, SHARED_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(SHARED_CHANNEL.id, PARTNER_ORG);
            await env.AUTHX_AUTHZED_API.addPartnerToOrg(PARTNER_ORG, TEST_ORG);

            // User from TEST_ORG creates JWT
            const token = await generateCatalystToken(TEST_ORG, [SHARED_CHANNEL.id], undefined, TEST_USER);

            // Verify access works
            const responseBefore = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: `{ sharedData }` }),
            });

            expect(responseBefore.status).toBe(200);

            // Simulate org deletion: remove partnership and user
            await env.AUTHX_AUTHZED_API.deletePartnerInOrg(PARTNER_ORG, TEST_ORG);
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(TEST_ORG, TEST_USER);

            // Verify AuthZed denies access
            const canRead = await env.AUTHX_AUTHZED_API.canReadFromDataChannel(SHARED_CHANNEL.id, TEST_USER);
            expect(canRead).toBe(false);

            // Try to use JWT after org relationships removed
            const responseAfter = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: `{ sharedData }` }),
            });

            console.log('Response after org deletion:', responseAfter.status);

            expect(responseAfter.status).toBe(200);
            const dataAfter = await responseAfter.json();
            // After org deletion, the schema is excluded, so queries return validation errors
            expect(dataAfter.errors).toBeDefined();
            expect(dataAfter.errors[0].message).toContain('Cannot query field');
            expect(dataAfter.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
        });
    });

    describe('Multiple Users from Same Org Lose Permissions', () => {
        it('should deny access for ALL users when org-level partnership is removed', async () => {
            // Setup: Three users from TEST_ORG, partnership with PARTNER_ORG
            // PARTNER_ORG owns the channel, TEST_ORG gets access ONLY through partnership
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(PARTNER_ORG, SHARED_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(SHARED_CHANNEL.id, PARTNER_ORG);
            await env.AUTHX_AUTHZED_API.addPartnerToOrg(PARTNER_ORG, TEST_ORG);

            // Verify users from TEST_ORG can read via partnership (before creating tokens)
            expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel(SHARED_CHANNEL.id, TEST_USER)).toBe(true);
            expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel(SHARED_CHANNEL.id, USER_B)).toBe(true);
            expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel(SHARED_CHANNEL.id, USER_C)).toBe(true);

            // All three users create tokens
            const tokenA = await generateCatalystToken(TEST_ORG, [SHARED_CHANNEL.id], undefined, TEST_USER);
            const tokenB = await generateCatalystToken(TEST_ORG, [SHARED_CHANNEL.id], undefined, USER_B);
            const tokenC = await generateCatalystToken(TEST_ORG, [SHARED_CHANNEL.id], undefined, USER_C);

            // Verify all tokens work
            for (const token of [tokenA, tokenB, tokenC]) {
                const response = await SELF.fetch('http://localhost:8787/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ query: `{ sharedData }` }),
                });
                expect(response.status).toBe(200);
            }

            // Remove partnership (org-level revocation)
            await env.AUTHX_AUTHZED_API.deletePartnerInOrg(PARTNER_ORG, TEST_ORG);

            // Wait briefly for AuthZed to propagate the deletion
            await new Promise((resolve) => setTimeout(resolve, 100));

            // All three tokens should fail after partnership removal
            for (const [token, userName] of [
                [tokenA, 'TEST_USER'],
                [tokenB, 'USER_B'],
                [tokenC, 'USER_C'],
            ]) {
                const response = await SELF.fetch('http://localhost:8787/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ query: `{ sharedData }` }),
                });

                console.log(`${userName} status after removal:`, response.status);

                expect(response.status).toBe(200);
                const data = await response.json();
                // After partnership removal, the schema is excluded, so queries return validation errors
                expect(data.errors).toBeDefined();
                expect(data.errors[0].message).toContain('Cannot query field');
                expect(data.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
            }
        });
    });

    describe('JWT Registry Out of Sync', () => {
        it('should deny access when JWT is missing from registry', async () => {
            // Setup channel and permissions
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, DELETABLE_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(DELETABLE_CHANNEL.id, TEST_ORG);

            // Create JWT
            const token = await generateCatalystToken(TEST_ORG, [DELETABLE_CHANNEL.id], undefined, TEST_USER);

            // Extract jwtId
            const { jwtId } = await env.AUTHX_TOKEN_API.validateToken(token, 'default');
            expect(jwtId).toBeDefined();

            // Verify token works
            const responseBefore = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: `{ deletableData }` }),
            });
            expect(responseBefore.status).toBe(200);

            // Manually delete registry entry (simulate corruption)
            const registryDoId = env.JWT_REGISTRY_DO.idFromName('default');
            const registryStub = env.JWT_REGISTRY_DO.get(registryDoId);
            await registryStub.delete(jwtId!);

            // Try to use JWT with missing registry entry
            const responseAfter = await SELF.fetch('http://localhost:8787/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: `{ deletableData }` }),
            });

            console.log('Response with missing registry:', responseAfter.status);

            expect(responseAfter.status).toBe(200);
            const dataAfter = await responseAfter.json();
            // After registry deletion, the schema is excluded, so queries return validation errors
            expect(dataAfter.errors).toBeDefined();
            expect(dataAfter.errors[0].message).toContain('Cannot query field');
            expect(dataAfter.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
        });
    });

    describe('JWT Creation for Already-Disabled Channel', () => {
        it('should prevent access when channel is disabled (accessSwitch=false)', async () => {
            // DISABLED_CHANNEL has accessSwitch=false from creation
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, DISABLED_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(DISABLED_CHANNEL.id, TEST_ORG);

            // Verify AuthZed allows read (ownership-based)
            const canReadViaAuthZed = await env.AUTHX_AUTHZED_API.canReadFromDataChannel(
                DISABLED_CHANNEL.id,
                TEST_USER
            );
            expect(canReadViaAuthZed).toBe(true); // AuthZed says YES

            // But JWT creation/usage should check accessSwitch
            let tokenCreationSucceeded = false;
            let token: string | undefined;

            try {
                token = await generateCatalystToken(TEST_ORG, [DISABLED_CHANNEL.id], undefined, TEST_USER);
                tokenCreationSucceeded = true;
            } catch (error) {
                console.log('JWT creation failed for disabled channel (expected):', error);
            }

            // If token was created, gateway must still deny access
            if (tokenCreationSucceeded && token) {
                const response = await SELF.fetch('http://localhost:8787/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ query: `{ disabledData }` }),
                });

                console.log('Response for disabled channel:', response.status);
                const data = await response.json();
                console.log('Response body:', JSON.stringify(data, null, 2));

                expect(response.status).toBe(200);
                // After channel is disabled, the schema is excluded, so queries return validation errors
                expect(data.errors).toBeDefined();
                expect(data.errors[0].message).toContain('Cannot query field');
                expect(data.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
            }
        });

        it('should not list disabled channels in splitTokenIntoSingleUseTokens', async () => {
            // Create JWT with both enabled and disabled channels
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, DELETABLE_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(DELETABLE_CHANNEL.id, TEST_ORG);
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, DISABLED_CHANNEL.id);
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(DISABLED_CHANNEL.id, TEST_ORG);

            const token = await generateCatalystToken(
                TEST_ORG,
                [DELETABLE_CHANNEL.id, DISABLED_CHANNEL.id],
                undefined,
                TEST_USER
            );

            // Split token - should only include enabled channel
            const result = await env.AUTHX_TOKEN_API.splitTokenIntoSingleUseTokens(token, 'default');

            if (result.success && result.channelPermissions) {
                const enabledPerm = result.channelPermissions.find((p) => p.claim === DELETABLE_CHANNEL.id);
                const disabledPerm = result.channelPermissions.find((p) => p.claim === DISABLED_CHANNEL.id);

                // Enabled channel succeeds
                expect(enabledPerm?.success).toBe(true);

                // Disabled channel fails or not present
                if (disabledPerm) {
                    expect(disabledPerm.success).toBe(false);
                    expect(disabledPerm.error).toMatch(/channel.*not.*found|not.*accessible/i);
                }

                console.log('Channel permissions:', JSON.stringify(result.channelPermissions, null, 2));
            }
        });
    });
});
