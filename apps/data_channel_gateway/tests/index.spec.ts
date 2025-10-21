// test/index.spec.ts
import { DataChannel, DEFAULT_STANDARD_DURATIONS } from '@catalyst/schemas';
import { JWTAudience } from '@catalyst/schemas';
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

        const response = await SELF.fetch('https://data-channel-gateway/graphql', {
            method: 'GET',
            headers,
        });
        const expected = { message: 'Invalid token format' };
        expect(JSON.parse(await response.text())).toStrictEqual(expected);
    });

    it("returns GF'd for no auth header", async () => {
        const response = await SELF.fetch('https://data-channel-gateway/graphql', {
            method: 'GET',
        });

        expect(await response.text()).toMatchInlineSnapshot(`"{"error":"No Credenetials Supplied"}"`);
    });

    it('should return health a known good token no claims', async (textCtx) => {
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
                // Get the possible queries from the schema
                query: `{
            __type(name: "Query") {
                name
                fields {
                  name
                  type {
                    name
                    kind
                    ofType {
                      name
                      kind
                    }
                  }
                }
              }
          }`,
            }),
        });
        const responsePayload = await response.json<{
            data: {
                __type: {
                    name: string;
                    fields: unknown[];
                };
            };
        }>();
        expect(response.status).toBe(200);
        console.log('responsePayload', responsePayload);
        // Since we did not provide claims when the token was created, this will only return the health query in the list of fields
        expect(responsePayload.data['__type'].fields).toHaveLength(1);
        // @ts-expect-error: ts complains
        expect(responsePayload.data['__type'].fields[0]['name']).toBe('health');
    });

    it('should get datachannel for airplanes', async (testContext: TestContext) => {
        await setup();

        // Get a token with the proper claims
        const token = await generateCatalystToken(
            TEST_ORG,
            ['airplanes1'],
            JWTAudience.enum['catalyst:gateway'],
            testContext
        );
        // add channel to org
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel('airplanes1', TEST_ORG);
        await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, 'airplanes1');

        const response = await SELF.fetch('http://localhost:8787/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                query: `
                    {
                        __type(name: "Query") {
                            name
                            fields {
                                name
                            }
                        }
                    }`,
            }),
        });

        const json = (await response.json()) as {
            data: {
                __type: {
                    fields: Array<{ name: string }>;
                };
            };
        };
        console.log('Response:', JSON.stringify(json, null, 2));

        expect(response.status).toBe(200);
        expect(json.data.__type.fields).toHaveLength(1); // Only expecting 'health' field
        expect(json.data.__type.fields[0].name).toBe('health');

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
        // STEP 1: Create a gateway token (UI → Gateway authentication)
        // This token has 'catalyst:gateway' audience and proves the user has access to 'airplanes1'
        const gatewayToken = await generateCatalystToken(
            TEST_ORG,
            ['airplanes1'],
            JWTAudience.enum['catalyst:gateway']
        );

        // STEP 2: Use gateway token to create single-use token (Gateway → Data Channel)
        // The API validates the gateway token and creates a NEW token with 'catalyst:datachannel' audience
        // The gateway token acts as a "permission slip" to prove we can create single-use tokens
        const singleUseToken = await env.AUTHX_TOKEN_API.signSingleUseJWT(
            'airplanes1',
            { catalystToken: gatewayToken }, // This proves we have gateway access
            'default'
        );

        expect(singleUseToken.success).toBe(true);

        // STEP 3: Try to misuse single-use token on gateway (should fail)
        // Single-use tokens are meant for data channels, not gateway access
        const singleUseHeaders = new Headers();
        singleUseHeaders.set('Authorization', `Bearer ${singleUseToken.token}`);

        const gatewayResponse = await SELF.fetch('https://data-channel-gateway/graphql', {
            method: 'GET',
            headers: singleUseHeaders,
        });

        // STEP 4: Verify security boundary enforcement
        // Gateway should reject tokens with 'catalyst:datachannel' audience
        expect(gatewayResponse.status).toBe(403);
        const gatewayData = await gatewayResponse.json();
        expect(gatewayData.message).toBe('Token audience is not valid for gateway access');
    });
});
