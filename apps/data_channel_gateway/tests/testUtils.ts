import { DataChannel } from '@catalyst/schema_zod';
import { env, fetchMock } from 'cloudflare:test';
import { TestContext } from 'vitest';

export const TEST_USER = 'test_user@mail.com';
export const TEST_ORG = 'test_org';

export function isWithinRange(value: number, min: number, max: number) {
    return value >= min && value <= max;
}

export const generateCatalystToken = async (entity: string, claims: string[], ctx?: TestContext, user?: string) => {
    const jwtDOID = env.JWT_TOKEN_DO.idFromName('default');
    const jwtStub = env.JWT_TOKEN_DO.get(jwtDOID);
    const tokenResp = await jwtStub.signJWT(
        {
            entity: `${entity}/${user || TEST_USER}`,
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

export const registerDataChannel = async (dataChannel: DataChannel) => {
    // Add proper permissions for the test user
    await env.AUTHX_AUTHZED_API.addOrgToDataChannel(dataChannel.id, TEST_ORG);
    await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, dataChannel.id);
    await env.AUTHX_AUTHZED_API.addUserToOrg(TEST_ORG, TEST_USER);

    // Update the data channel using the Durable Object
    const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
    const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id);
    await stub.update(dataChannel);
};

export const createMockGraphqlEndpoint = (
    endpoint: string,
    typeDefs: string,
    dataStore: Record<string, string | object | number>
) => {
    if (endpoint.includes('/graphql')) {
        endpoint = endpoint.replace('/graphql', '');
    }

    fetchMock
        .get(endpoint)
        .intercept({
            path: '/graphql',
            method: 'POST',
            body: (body) => {
                return body.toString().includes('_sdl');
            },
        })
        .reply(200, { data: { _sdl: typeDefs } });

    fetchMock
        .get(endpoint)
        .intercept({
            path: '/graphql',
            method: 'POST',
            body: (body) => {
                // if body includes any of the keys in the dataStore, return true
                return !body.toString().includes('_sdl');
            },
        })
        .reply(200, ({ body }) => {
            return {
                data: Object.keys(dataStore).reduce(
                    (acc, key) => {
                        if (body?.toString().includes(key)) {
                            acc[key] = dataStore[key];
                        }
                        return acc;
                    },
                    {} as Record<string, string | object | number>
                ),
            };
        })
        .persist();
};
