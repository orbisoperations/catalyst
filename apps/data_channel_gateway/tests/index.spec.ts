// test/index.spec.ts
import { DataChannel, DEFAULT_STANDARD_DURATIONS } from '@catalyst/schema_zod';
import { env, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, TestContext } from 'vitest';
import { isWithinRange } from './testUtils';
const TEST_USER = 'test_user@mail.com';
const TEST_ORG = 'test_org';

const getToken = async (entity: string, claims: string[], ctx?: TestContext) => {
    const jwtDOID = env.JWT_TOKEN_DO.idFromName('default');
    const jwtStub = env.JWT_TOKEN_DO.get(jwtDOID);
    const tokenResp = await jwtStub.signJWT(
        {
            entity: `${entity}/${TEST_USER}`,
            claims: claims,
        },
        10 * 60 * 1000
    );

    console.log({
        test: ctx?.task.name,
        signedTokenForTest: tokenResp.token,
    });

    return tokenResp.token;
};

const setup = async () => {
    // Only add the airplane data channel for the airplane test
    const airplanes1: DataChannel = {
        id: 'airplanes1',
        name: 'airplanes1',
        endpoint: 'http://localhost:8080/graphql',
        accessSwitch: true,
        description: 'Test airplane data channel',
        creatorOrganization: TEST_ORG,
    };

    // Add proper permissions for the test user
    await env.AUTHX_AUTHZED_API.addOrgToDataChannel(airplanes1.id, TEST_ORG);
    await env.AUTHX_AUTHZED_API.addUserToOrg(TEST_ORG, TEST_USER);

    // Update the data channel using the Durable Object
    const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
    const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id);
    await stub.update(airplanes1);
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
        const expected = { message: 'Token validation failed' };
        expect(JSON.parse(await response.text())).toStrictEqual(expected);
    });

    it("returns GF'd for no auth header", async () => {
        const response = await SELF.fetch('https://data-channel-gateway/graphql', {
            method: 'GET',
        });

        expect(await response.text()).toMatchInlineSnapshot(`"{"error":"No Credenetials Supplied"}"`);
    });

    it('should return health a known good token no claims', async (textCtx) => {
        const token = await getToken('test', [], textCtx);
        const response = await SELF.fetch('https://data-channel-gateway/graphql', {
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

        // Since we did not provide claims when the token was created, this will only return the health query in the list of fields
        expect(responsePayload.data['__type'].fields).toHaveLength(1);
        // @ts-expect-error: ts complains
        expect(responsePayload.data['__type'].fields[0]['name']).toBe('health');
    });

    it('should get datachannel for airplanes', async (testContext: TestContext) => {
        await setup();

        // Get a token with the proper claims
        const token = await getToken(TEST_ORG, ['airplanes1'], testContext);
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

        const token = await getToken(TEST_ORG, [dataChannel.id], testContext); // token with claims for all data channels

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
        const dataChannels: DataChannel[] = [
            {
                id: 'airplanes1',
                name: 'airplanes1',
                endpoint: 'http://localhost:8080/graphql',
                accessSwitch: true,
                description: 'Test airplane data channel',
                creatorOrganization: TEST_ORG,
            },
            {
                id: 'airplanes2',
                name: 'airplanes2',
                endpoint: 'http://localhost:8080/graphql',
                accessSwitch: true,
                description: 'Test airplane data channel',
                creatorOrganization: TEST_ORG,
            },
        ];

        const ids = dataChannels.map((dataChannel) => dataChannel.id);
        const token = await getToken(TEST_ORG, ids, testContext); // token with claims for all data channels

        // get data channel registry
        const dChannelRegistryId = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
        const dChannelRegistryStub = env.DATA_CHANNEL_REGISTRAR_DO.get(dChannelRegistryId);

        for (const dataChannel of dataChannels) {
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
});
