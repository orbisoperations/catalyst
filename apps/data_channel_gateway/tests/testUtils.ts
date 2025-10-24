import { DataChannel, JWTAudience } from '@catalyst/schema_zod';
import { env, fetchMock } from 'cloudflare:test';
import { TestContext } from 'vitest';

export const TEST_USER = 'test_user@mail.com';
export const TEST_ORG = 'test_org';

export function isWithinRange(value: number, min: number, max: number) {
    return value >= min && value <= max;
}

export const generateCatalystToken = async (
    entity: string,
    claims: string[],
    audience: JWTAudience,
    ctx?: TestContext,
    user?: string
) => {
    // Set up permissions BEFORE creating the token
    for (const claim of claims) {
        await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, claim);
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel(claim, TEST_ORG);
    }
    await env.AUTHX_AUTHZED_API.addUserToOrg(TEST_ORG, user || TEST_USER);

    // Use AUTHX_TOKEN_API worker to properly register the token
    const tokenResp = await env.AUTHX_TOKEN_API.signJWT(
        {
            entity: `${entity}/${user || TEST_USER}`,
            claims: claims,
            audience: audience,
        },
        10 * 60 * 1000,
        { cfToken: 'cf-test-token' }, // Use the mock CF token
        'default'
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

/**
 * Generates a legacy token without an audience field for backwards compatibility testing.
 *
 * WHY THIS EXISTS:
 * - Before JWT audience differentiation, tokens were created without an 'aud' claim
 * - The main API (signJWT) now defaults to 'catalyst:gateway' audience if none provided
 * - To test true backwards compatibility, we need tokens that genuinely lack an audience field
 * - This function bypasses the main API and calls the Durable Object directly
 * - It creates tokens that match the old format (no 'aud' claim) for testing legacy behavior
 *
 * This is essential for testing that the gateway correctly accepts old tokens without audience
 * while rejecting new tokens with wrong audience (e.g., 'catalyst:datachannel' on gateway).
 */
export const generateLegacyToken = async (entity: string, claims: string[], ctx?: TestContext, user?: string) => {
    // Set up permissions BEFORE creating the token
    for (const claim of claims) {
        await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, claim);
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel(claim, TEST_ORG);
    }
    await env.AUTHX_AUTHZED_API.addUserToOrg(TEST_ORG, user || TEST_USER);

    // Call Durable Object directly to create token without audience
    const jwtDOID = env.JWT_TOKEN_DO.idFromName('default');
    const jwtStub = env.JWT_TOKEN_DO.get(jwtDOID);
    const tokenResp = await jwtStub.signJWT(
        {
            entity: `${entity}/${user || TEST_USER}`,
            claims: claims,
            // No audience field - this will create a token without an audience
        },
        10 * 60 * 1000
    );

    // Manually register the token in the JWT registry since we bypassed the main API
    const { decodeJwt } = await import('jose');
    const decoded = decodeJwt(tokenResp.token);

    await env.ISSUED_JWT_REGISTRY.createSystem(
        {
            id: decoded.jti as string,
            name: `Legacy token for ${user || TEST_USER}`,
            description: `Legacy token with ${claims.length} data channel claims (no audience)`,
            claims: claims,
            expiry: new Date((decoded.exp as number) * 1000),
            organization: entity,
            status: 'active',
        },
        'authx_token_api',
        'default'
    );

    return tokenResp.token;
};
