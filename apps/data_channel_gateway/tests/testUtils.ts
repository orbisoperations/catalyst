import { DataChannel, JWTAudience } from '@catalyst/schema_zod';
import { env, fetchMock } from 'cloudflare:test';
import { TestContext } from 'vitest';

export const TEST_USER = 'test_user@mail.com';
export const TEST_ORG = 'test_org';

export function isWithinRange(value: number, min: number, max: number) {
    return value >= min && value <= max;
}

<<<<<<< HEAD
export const generateCatalystToken = async (entity: string, claims: string[], ctx?: TestContext, user?: string) => {
    // Set up permissions BEFORE creating the token
    for (const claim of claims) {
        await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, claim);
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel(claim, TEST_ORG);
    }
    await env.AUTHX_AUTHZED_API.addUserToOrg(TEST_ORG, user || TEST_USER);

    // Use AUTHX_TOKEN_API worker to properly register the token
    const tokenResp = await env.AUTHX_TOKEN_API.signJWT(
=======
export const generateCatalystToken = async (
    entity: string,
    claims: string[],
    audience: JWTAudience,
    ctx?: TestContext,
    user?: string
) => {
    const jwtDOID = env.JWT_TOKEN_DO.idFromName('default');
    const jwtStub = env.JWT_TOKEN_DO.get(jwtDOID);
    const tokenResp = await jwtStub.signJWT(
>>>>>>> 259cf3c (fix: add missing audience field to JWTSigningRequest in test files)
        {
            entity: `${entity}/${user || TEST_USER}`,
            claims: claims,
            audience: audience,
        },
<<<<<<< HEAD
        10 * 60 * 1000,
<<<<<<< HEAD
        { cfToken: 'cf-test-token' }, // Use the mock CF token
        'default'
=======
        JWTAudience.enum['catalyst:gateway']
>>>>>>> 99bd829 (feat: implement JWT audience differentiation for enhanced security)
=======
        10 * 60 * 1000
>>>>>>> 1bdf3ab (refactor: move JWT audience into JWTSigningRequest object)
    );

    if (!tokenResp.success) {
        throw new Error(`Failed to create catalyst token: ${tokenResp.error}`);
    }

    console.log({
        test: ctx?.task.name,
        signedTokenForTest: tokenResp.token,
    });

    return tokenResp.token!;
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
        .reply(200, { data: { _sdl: typeDefs } })
        .persist();

    fetchMock
        .get(endpoint)
        .intercept({
            path: '/graphql',
            method: 'POST',
            body: (body) => {
                // if body includes any of the keys in the dataStore, return true
                return (
                    !body.toString().includes('_sdl') &&
                    Object.keys(dataStore).some((key) => body.toString().includes(key))
                );
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
