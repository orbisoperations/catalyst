// test/index.spec.ts
import { env, SELF } from 'cloudflare:test';
import { describe, expect, it, TestContext } from 'vitest';

// Define the DataChannel interface
interface DataChannel {
    id: string;
    name: string;
    endpoint: string;
    organization: string;
    schema: string;
    type: string;
    accessSwitch?: boolean;
    description?: string;
    creatorOrganization?: string;
}

const getToken = async (entity: string, claims: string[], ctx?: TestContext) => {
    const jwtDOID = env.JWT_TOKEN_DO.idFromName('default');
    const jwtStub = env.JWT_TOKEN_DO.get(jwtDOID);
    const tokenResp = await jwtStub.signJWT(
        {
            entity: entity,
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
        organization: 'test_org',
        schema: 'type Query { health: String }',
        type: 'graphql',
        accessSwitch: true,
        description: 'Test airplane data channel',
        creatorOrganization: 'test_org',
    };

    // Add proper permissions for the test user
    await env.AUTHX_AUTHZED_API.addOrgToDataChannel(airplanes1.id, airplanes1.organization);
    await env.AUTHX_AUTHZED_API.addUserToOrg(airplanes1.organization, 'test_user');

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

    // Clean up permissions
    await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel('airplanes1', 'test_org');
    await env.AUTHX_AUTHZED_API.deleteUserFromOrg('test_org', 'test_user');
};

describe('gateway integration tests', () => {
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
        const token = await getToken('test_user', ['airplanes1'], testContext);

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

    // it('should get data-channel for airplanes only when accessSwitch is 1 - THIS IS A BAD TEST', async (testContext) => {
    //     await setup(env);
    //     const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
    //     const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id);
    //     await stub.update({
    //         id: 'airplanes1',
    //         name: 'airplanes',
    //         endpoint: 'http://localhost:4001/graphql',
    //         accessSwitch: false,
    //         description: 'na',
    //         creatorOrganization: 'Org1',
    //     });

    //     const token = await getToken('Org1', ['airplanes'], testContext);

    //     // checks that airplanes is disabled
    //     const dataChannelList = await env.DATA_CHANNEL_REGISTRAR.list(
    //         'default',
    //         {
    //             catalystToken: token,
    //         }
    //     );
    //
    //     expect((await stub.list()).length).toBe(2);

    //     const getAvailableQueries = await SELF.fetch(
    //         'https://data-channel-gateway/graphql',
    //         {
    //             method: 'POST',
    //             headers: {
    //                 Authorization: `Bearer ${token}`,
    //                 'content-type': 'application/json',
    //             },
    //             body: JSON.stringify({
    //                 // Query that resolves the available queries of the schema
    //                 query: `{
    //         __type(name: "Query") {
    //             name
    //             fields {
    //               name
    //             }
    //           }
    //       }`,
    //             }),
    //         }
    //     );

    //     const getAvailableQueriesResponsePayload = await getAvailableQueries.text();

    //

    //     const json = JSON.parse(getAvailableQueriesResponsePayload);

    //

    //     // Since we did not provide claims when the token was created, this will only return the health query in the list of fields
    //     expect(json.data['__type'].fields).toHaveLength(1);

    //     expect(json.data['__type'].fields[0]['name']).toBe('health');
    //     await teardown(env);
    // });
});
