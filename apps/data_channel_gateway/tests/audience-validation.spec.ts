import { DataChannel, JWTAudience } from '@catalyst/schema_zod';
import { env, SELF } from 'cloudflare:test';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { generateCatalystToken, TEST_ORG, TEST_USER } from './testUtils';

const DUMMY_DATA_CHANNELS: DataChannel[] = [
    {
        id: 'airplanes1',
        name: 'airplanes1',
        endpoint: 'http://localhost:8080/graphql',
        accessSwitch: true,
        description: 'Test data channel for airplanes1',
        creatorOrganization: TEST_ORG,
    },
    {
        id: 'airplanes2',
        name: 'airplanes2',
        endpoint: 'http://localhost:8081/graphql',
        accessSwitch: true,
        description: 'Test data channel for airplanes2',
        creatorOrganization: TEST_ORG,
    },
];

const setup = async () => {
    await env.AUTHX_AUTHZED_API.addUserToOrg(TEST_ORG, TEST_USER);
    await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(TEST_ORG, TEST_USER);

    // Set up data channels
    for (const dataChannel of DUMMY_DATA_CHANNELS) {
        // Add proper permissions for the test user
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel(dataChannel.id, TEST_ORG);
        await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, dataChannel.id);

        // Update the data channel using the Durable Object
        const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
        const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id);
        await stub.update(dataChannel);
    }
};

const teardown = async () => {
    await env.AUTHX_AUTHZED_API.deleteUserFromOrg(TEST_ORG, TEST_USER);
};

describe('JWT Audience Validation Tests', () => {
    beforeEach(async () => {
        await setup();
    });

    afterEach(async () => {
        await teardown();
    });

    describe('Gateway Access with Different Audiences', () => {
        it('should accept tokens with catalyst:gateway audience', async () => {
            // Create a token with gateway audience
            const token = await generateCatalystToken(TEST_ORG, ['airplanes1'], JWTAudience.enum['catalyst:gateway']);

            const headers = new Headers();
            headers.set('Authorization', `Bearer ${token}`);

            const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'GET',
                headers,
            });

            expect(response.status).toBe(200);
        });

        it('should reject tokens with catalyst:datachannel audience', async () => {
            // Create a token with datachannel audience (simulating single-use token)
            const jwtDOID = env.JWT_TOKEN_DO.idFromName('default');
            const jwtStub = env.JWT_TOKEN_DO.get(jwtDOID);
            const tokenResp = await jwtStub.signJWT(
                {
                    entity: `${TEST_ORG}/${TEST_USER}`,
                    claims: ['airplanes1'],
                    audience: JWTAudience.enum['catalyst:datachannel'],
                },
                10 * 60 * 1000
            );

            const headers = new Headers();
            headers.set('Authorization', `Bearer ${tokenResp.token}`);

            const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'GET',
                headers,
            });

            expect(response.status).toBe(403);
            const data = await response.json();
            expect(data.message).toBe('Token audience is not valid for gateway access');
        });

        it('should reject tokens with catalyst:system audience', async () => {
            // Create a token with system audience
            const jwtDOID = env.JWT_TOKEN_DO.idFromName('default');
            const jwtStub = env.JWT_TOKEN_DO.get(jwtDOID);
            const tokenResp = await jwtStub.signJWT(
                {
                    entity: `system-test-service`,
                    claims: ['airplanes1'],
                    audience: JWTAudience.enum['catalyst:system'],
                },
                10 * 60 * 1000
            );

            const headers = new Headers();
            headers.set('Authorization', `Bearer ${tokenResp.token}`);

            const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'GET',
                headers,
            });

            expect(response.status).toBe(403);
            const data = await response.json();
            expect(data.message).toBe('Token audience is not valid for gateway access');
        });

        it('should accept tokens with no audience (backwards compatibility)', async () => {
            // Create a token without audience (simulating old token)
            const jwtDOID = env.JWT_TOKEN_DO.idFromName('default');
            const jwtStub = env.JWT_TOKEN_DO.get(jwtDOID);
            const tokenResp = await jwtStub.signJWT(
                {
                    entity: `${TEST_ORG}/${TEST_USER}`,
                    claims: ['airplanes1'],
                    // No audience field - simulating old token
                },
                10 * 60 * 1000
            );

            const headers = new Headers();
            headers.set('Authorization', `Bearer ${tokenResp.token}`);

            const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'GET',
                headers,
            });

            expect(response.status).toBe(200);
        });

        it('should reject tokens with invalid audience values', async () => {
            // Create a token with invalid audience
            const jwtDOID = env.JWT_TOKEN_DO.idFromName('default');
            const jwtStub = env.JWT_TOKEN_DO.get(jwtDOID);
            const tokenResp = await jwtStub.signJWT(
                {
                    entity: `${TEST_ORG}/${TEST_USER}`,
                    claims: ['airplanes1'],
                    audience: 'invalid:audience' as JWTAudience,
                },
                10 * 60 * 1000
            );

            const headers = new Headers();
            headers.set('Authorization', `Bearer ${tokenResp.token}`);

            const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'GET',
                headers,
            });

            expect(response.status).toBe(403);
            const data = await response.json();
            expect(data.message).toBe('Token audience is not valid for gateway access');
        });
    });

    describe('Single-Use Token Creation', () => {
        it('should create single-use tokens with catalyst:datachannel audience', async () => {
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
            expect(singleUseToken.token).toBeDefined();

            // STEP 3: Verify the single-use token has the correct audience
            // Single-use tokens should always have 'catalyst:datachannel' audience (set by the API)
            const jwtDOID = env.JWT_TOKEN_DO.idFromName('default');
            const jwtStub = env.JWT_TOKEN_DO.get(jwtDOID);
            const validation = await jwtStub.validateToken(singleUseToken.token!);

            expect(validation.valid).toBe(true);
            expect(validation.audience).toBe(JWTAudience.enum['catalyst:datachannel']);
        });

        it('should prevent single-use tokens from accessing gateway', async () => {
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
            const gatewayHeaders = new Headers();
            gatewayHeaders.set('Authorization', `Bearer ${singleUseToken.token}`);

            const gatewayResponse = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'GET',
                headers: gatewayHeaders,
            });

            // STEP 4: Verify security boundary enforcement
            // Gateway should reject tokens with 'catalyst:datachannel' audience
            expect(gatewayResponse.status).toBe(403);
            const gatewayData = await gatewayResponse.json();
            expect(gatewayData.message).toBe('Token audience is not valid for gateway access');
        });
    });

    describe('Token Validation Endpoint', () => {
        it('should validate tokens with correct audience through validation endpoint', async () => {
            const gatewayToken = await generateCatalystToken(
                TEST_ORG,
                ['airplanes1'],
                JWTAudience.enum['catalyst:gateway']
            );

            const response = await SELF.fetch('https://data-channel-gateway/validate-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([
                    {
                        claimId: 'airplanes1',
                        catalystToken: gatewayToken,
                    },
                ]),
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data[0].valid).toBe(true);
        });

        it('should reject single-use tokens through validation endpoint', async () => {
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

            // STEP 3: Try to validate single-use token through validation endpoint (should fail)
            // The validation endpoint should reject single-use tokens (only gateway tokens allowed)
            const response = await SELF.fetch('https://data-channel-gateway/validate-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([
                    {
                        claimId: 'airplanes1',
                        catalystToken: singleUseToken.token,
                    },
                ]),
            });

            // STEP 4: Verify validation endpoint enforces audience restrictions
            // Should return 200 but with valid: false due to wrong audience
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data[0].valid).toBe(false);
            expect(data[0].error).toBe('Token audience is not valid for gateway access');
        });
    });
});
