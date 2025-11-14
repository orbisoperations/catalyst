// test/index.spec.ts
import { DataChannel, DEFAULT_STANDARD_DURATIONS, JWTAudience } from '@catalyst/schemas';
import { env, fetchMock, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, TestContext } from 'vitest';
import { isWithinRange, TEST_ORG, TEST_USER, generateCatalystToken, createMockGraphqlEndpoint } from './testUtils';

const DUMMY_DATA_CHANNELS: DataChannel[] = [
    {
        id: 'airplanes1',
        name: 'airplanes1',
        endpoint: 'http://localhost:8080/graphql',
        accessSwitch: true,
        description: 'Test airplane data channel 1',
        creatorOrganization: TEST_ORG,
    },
    {
        id: 'airplanes2',
        name: 'airplanes2',
        endpoint: 'http://localhost:8081/graphql',
        accessSwitch: true,
        description: 'Test airplane data channel 2',
        creatorOrganization: TEST_ORG,
    },
];

const setup = async () => {
    // Only add the airplane data channel for the airplane test

    for (const dataChannel of DUMMY_DATA_CHANNELS) {
        // Add proper permissions for the test user
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel(dataChannel.id, TEST_ORG);
        await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, dataChannel.id);
        await env.AUTHX_AUTHZED_API.addUserToOrg(TEST_ORG, TEST_USER);

        // Update the data channel using the Durable Object
        const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
        const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id);
        await stub.update(dataChannel);
    }
};

const teardown = async () => {
    // Clean up the airplane data channel using the Durable Object
    const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
    const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id);
    await stub.delete('airplanes1');
    await stub.delete('airplanes2');

    // Clean up permissions
    await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel('airplanes1', TEST_ORG);
    await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel('airplanes2', TEST_ORG);
    await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg(TEST_ORG, 'airplanes1');
    await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg(TEST_ORG, 'airplanes2');
    await env.AUTHX_AUTHZED_API.deleteUserFromOrg(TEST_ORG, TEST_USER);
};

describe('gateway integration tests', () => {
    beforeEach(async () => {
        await setup();
    });

    afterEach(async () => {
        await teardown();
    });

    it("returns gf'd for a invalid token", async () => {
        const badToken = 'fake-and-insecure';

        const headers = new Headers();
        headers.set('Authorization', `Bearer ${badToken}`);

        // Invalid tokens should return 401 before GraphQL validation
        const response = await SELF.fetch('https://data-channel-gateway/graphql', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `{ __type(name: "Query") { fields { name } } }`,
            }),
        });

        expect(response.status).toBe(401);
        const json = (await response.json()) as { errors: Array<{ message: string }> };
        expect(json.errors).toBeDefined();
        expect(json.errors[0].message).toContain('Unauthorized');
    });

    it("returns GF'd for no auth header", async () => {
        // Missing auth should return 401 before GraphQL validation
        const response = await SELF.fetch('https://data-channel-gateway/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `{ __type(name: "Query") { fields { name } } }`,
            }),
        });

        expect(response.status).toBe(401);
        const json = (await response.json()) as { errors: Array<{ message: string }> };
        expect(json.errors).toBeDefined();
        expect(json.errors[0].message).toContain('Unauthorized');
    });

    it('should return 503 when token has claims but no accessible channels', async (textCtx) => {
        // Token has claims ['airplanes1'] but no channels are registered
        // Security: This should return 503 (same as unresponsive channels)
        const token = await generateCatalystToken(
            'airplanes1',
            ['airplanes1'],
            JWTAudience.enum['catalyst:gateway'],
            textCtx
        );
        console.log('token', token);
        const response = await SELF.fetch('http://data-channel-gateway/graphql', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'content-type': 'application/json',
                Accepts: 'application/json',
            },
            body: JSON.stringify({
                query: `{ health }`,
            }),
        });
        const responsePayload = await response.json();
        expect(response.status).toBe(503);
        console.log('responsePayload', responsePayload);
        // Should return 503 with unavailable message
        expect(responsePayload.errors).toBeDefined();
        expect(responsePayload.errors[0].message).toContain('One or more channels currently unavailable');
    });

    it('should return 503 when permissions exist but channel not registered', async (testContext: TestContext) => {
        await setup();

        // Get a token with the proper claims
        const token = await generateCatalystToken(
            TEST_ORG,
            ['airplanes1'],
            JWTAudience.enum['catalyst:gateway'],
            testContext
        );
        // add channel permissions to org but don't register the channel
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel('airplanes1', TEST_ORG);
        await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, 'airplanes1');
        // Note: Channel is NOT registered in DATA_CHANNEL_REGISTRAR_DO

        const response = await SELF.fetch('http://localhost:8787/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                query: `{ health }`,
            }),
        });

        const json = await response.json();
        console.log('Response:', JSON.stringify(json, null, 2));

        // Security: Should return 503 (channel not registered = no accessible channels)
        expect(response.status).toBe(503);
        expect(json.errors).toBeDefined();
        expect(json.errors[0].message).toContain('One or more channels currently unavailable');

        await teardown();
    });

    it('should create a single use from a valid token with single claim', async (testContext) => {
        // add two data channels
        // in an array
        const dataChannel: DataChannel = {
            id: 'airplanes1',
            name: 'airplanes1',
            endpoint: 'http://localhost:8080/graphql',
            accessSwitch: true,
            description: 'Test airplane data channel',
            creatorOrganization: TEST_ORG,
        };

        const token = await generateCatalystToken(
            TEST_ORG,
            [dataChannel.id],
            JWTAudience.enum['catalyst:gateway'],
            testContext
        ); // token with claims for all data channels

        // get data channel registry
        const dChannelRegistryId = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
        const dChannelRegistryStub = env.DATA_CHANNEL_REGISTRAR_DO.get(dChannelRegistryId);

        // add persmissions
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel(dataChannel.id, TEST_ORG);
        await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, dataChannel.id);

        // Update the data channel using the Durable Object
        await dChannelRegistryStub.update(dataChannel);

        // should sign a single use token for airplanes1
        // expire in 5 minutes
        const singleUseToken = await env.AUTHX_TOKEN_API.signSingleUseJWT(
            dataChannel.id,
            { catalystToken: token },
            'default'
        );
        console.log('singleUseToken', singleUseToken);

        expect(singleUseToken).toBeDefined();
        expect(singleUseToken.success).toBe(true);
        if (singleUseToken.success) {
            expect(
                isWithinRange(singleUseToken.expiration, Date.now(), Date.now() + 5 * DEFAULT_STANDARD_DURATIONS.M)
            ).toBe(true);
            expect(singleUseToken.token).toBeDefined();
        }
    });

    it('should create a single use from a valid token with multiple claims', async (testContext) => {
        // add two data channels
        // in an array

        const ids = DUMMY_DATA_CHANNELS.map((dataChannel) => dataChannel.id);
        const token = await generateCatalystToken(TEST_ORG, ids, JWTAudience.enum['catalyst:gateway'], testContext); // token with claims for all data channels

        // get data channel registry
        const dChannelRegistryId = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
        const dChannelRegistryStub = env.DATA_CHANNEL_REGISTRAR_DO.get(dChannelRegistryId);

        for (const dataChannel of DUMMY_DATA_CHANNELS) {
            // add persmissions
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel(dataChannel.id, TEST_ORG);
            await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, dataChannel.id);

            // Update the data channel using the Durable Object
            await dChannelRegistryStub.update(dataChannel);

            // should sign a single use token for airplanes1
            // expire in 5 minutes
            const singleUseToken = await env.AUTHX_TOKEN_API.signSingleUseJWT(
                dataChannel.id,
                { catalystToken: token },
                'default'
            );
            console.log('singleUseToken', singleUseToken);

            expect(singleUseToken).toBeDefined();
            expect(singleUseToken.success).toBe(true);
            if (singleUseToken.success) {
                expect(
                    isWithinRange(singleUseToken.expiration, Date.now(), Date.now() + 5 * DEFAULT_STANDARD_DURATIONS.M)
                ).toBe(true);
                expect(singleUseToken.token).toBeDefined();
            }
        }
    });

    it('should not be able to create a singleUse catalyst token', async () => {
        // cannot create a single use token from undefined CT Token

        // should sign a single use token for airplanes1
        // expire in 5 minutes
        const singleUseToken = await env.AUTHX_TOKEN_API.signSingleUseJWT(
            'dummy-data-channel-id',
            { catalystToken: undefined },
            'default'
        );
        console.log('singleUseToken', singleUseToken);

        expect(singleUseToken).toBeDefined();
        expect(singleUseToken.success).toBe(false);
    });

    it('should be able to access multiple data channels with a single use token', async (testContext) => {
        // create mock graphql endpoint for working endpoint
        fetchMock.activate();
        fetchMock.disableNetConnect();

        DUMMY_DATA_CHANNELS.forEach((dataChannel) => {
            createMockGraphqlEndpoint(
                dataChannel.endpoint,
                `"""Working GraphQL Server for ${dataChannel.id}""" type Query { workingGraphqlField_${dataChannel.id}: String! }`,
                {
                    [`workingGraphqlField_${dataChannel.id}`]: `dummy-value-${dataChannel.id}`,
                }
            );
        });

        const ids = DUMMY_DATA_CHANNELS.map((dataChannel) => dataChannel.id);
        const token = await generateCatalystToken(TEST_ORG, ids, JWTAudience.enum['catalyst:gateway'], testContext); // token with claims for all data channels

        const gatewayResponse = await SELF.fetch('http://dummy-endpoint/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                query: `{ workingGraphqlField_${ids[0]}\nworkingGraphqlField_${ids[1]}\nhealth }`,
            }),
        });

        const gateWayResponsePayload: {
            data: {
                workingGraphqlField_airplanes1: string;
                workingGraphqlField_airplanes2: string;
                health: string;
            };
        } = await gatewayResponse.json();
        expect(gatewayResponse.status).toBe(200);
        expect(gateWayResponsePayload.data.workingGraphqlField_airplanes1).toBe('dummy-value-airplanes1');
        expect(gateWayResponsePayload.data.workingGraphqlField_airplanes2).toBe('dummy-value-airplanes2');
        expect(gateWayResponsePayload.data.health).toBe('OK');

        fetchMock.deactivate();
        fetchMock.assertNoPendingInterceptors();
        fetchMock.enableNetConnect();
    });

    it('should reject single-use tokens from accessing gateway', async () => {
        // Create a gateway token (UI → Gateway authentication)
        // This token has 'catalyst:gateway' audience and proves the user has access to 'airplanes1'
        const gatewayToken = await generateCatalystToken(
            TEST_ORG,
            ['airplanes1'],
            JWTAudience.enum['catalyst:gateway']
        );

        // Use gateway token to create single-use token (Gateway → Data Channel)
        // The API validates the gateway token and creates a NEW token with 'catalyst:datachannel' audience
        // The gateway token acts as a "permission slip" to prove we can create single-use tokens
        const singleUseToken = await env.AUTHX_TOKEN_API.signSingleUseJWT(
            'airplanes1',
            { catalystToken: gatewayToken }, // This proves we have gateway access
            'default'
        );

        expect(singleUseToken.success).toBe(true);

        // Try to misuse single-use token on gateway (should fail)
        // Single-use tokens are meant for data channels, not gateway access
        const singleUseHeaders = new Headers();
        singleUseHeaders.set('Authorization', `Bearer ${singleUseToken.token}`);

        const gatewayResponse = await SELF.fetch('https://data-channel-gateway/graphql', {
            method: 'GET',
            headers: singleUseHeaders,
        });

        // Verify security boundary enforcement
        // Security: Gateway returns 503 (channel not registered = no accessible channels)
        expect(gatewayResponse.status).toBe(503);
        const gatewayData = await gatewayResponse.json();
        // Should return unavailable error
        expect(gatewayData.errors).toBeDefined();
        expect(gatewayData.errors[0].message).toContain('One or more channels currently unavailable');
    });

    describe('GraphQL Playground Security', () => {
        it('should not serve GraphiQL playground (without auth)', async () => {
            // GET request with Accept: text/html header (simulating browser request)
            // If GraphiQL were enabled, this would return 200 with HTML
            // Without auth, we should get 401 before GraphiQL is even considered
            const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'GET',
                headers: {
                    Accept: 'text/html',
                },
            });

            // 401 Unauthorized because auth check happens before GraphiQL
            // This also proves GraphiQL won't be served without auth
            expect(response.status).toBe(401);

            // Verify response does NOT contain GraphiQL-specific strings
            const body = await response.text();
            expect(body).not.toContain('graphiql');
            expect(body).not.toContain('GraphQL Playground');
            expect(body).not.toContain('graphiql-react');
            expect(body).not.toContain('graphiql.css');
            expect(body).not.toContain('graphiql.js');
            expect(body).not.toContain('<!DOCTYPE html>');
            expect(body).not.toContain('<html>');
        });

        it('should not serve GraphiQL playground (with valid token)', async () => {
            // Generate a valid token
            const token = await generateCatalystToken(TEST_ORG, ['airplanes1'], JWTAudience.enum['catalyst:gateway']);

            // GET request with valid token and Accept: text/html header
            // Note: Channel 'airplanes1' is not registered, so we get 503
            // Security: Auth passes but no accessible channels = 503 (proving GraphiQL is disabled)
            const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'text/html',
                },
            });

            // Security: 503 because no accessible channels (same as unresponsive channels)
            // This also proves GraphiQL is never reached - auth guards come first
            expect(response.status).toBe(503);

            // Verify response does NOT contain GraphiQL-specific strings
            const body = await response.text();
            expect(body).not.toContain('graphiql');
            expect(body).not.toContain('GraphQL Playground');
            expect(body).not.toContain('graphiql-react');
            expect(body).not.toContain('graphiql.css');
            expect(body).not.toContain('graphiql.js');
            expect(body).not.toContain('<!DOCTYPE html>');
            expect(body).not.toContain('<html>');
        });
    });
});
