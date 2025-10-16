import { DataChannel } from '@catalyst/schema_zod';
import { JWTAudience } from '../../../packages/schemas';
import { env, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TEST_ORG, TEST_USER, generateCatalystToken } from './testUtils';
import type { ValidateTokenResponse } from '../src/index';

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

describe('validate endpoint tests', () => {
    beforeEach(async () => {
        await setup();
    });

    afterEach(async () => {
        await teardown();
    });

    it('should return 400 for non-array request body', async () => {
        const response = await SELF.fetch('https://data-channel-gateway/validate-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ invalid: 'request' }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data).toEqual({ error: 'request body must be an array' });
    });

    it('should validate a single valid claim', async (testContext) => {
        const token = await generateCatalystToken(
            TEST_ORG,
            ['airplanes1'],
            JWTAudience.enum['catalyst:gateway'],
            testContext
        );

        const response = await SELF.fetch('https://data-channel-gateway/validate-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                {
                    claimId: 'airplanes1',
                    catalystToken: token,
                },
            ]),
        });

        expect(response.status).toBe(200);
        const data = (await response.json()) as ValidateTokenResponse[];
        expect(data).toEqual([
            {
                claimId: 'airplanes1',
                catalystToken: token,
                valid: true,
                error: '',
            },
        ]);
    });

    it('should validate multiple claims', async (testContext) => {
        const token = await generateCatalystToken(
            TEST_ORG,
            ['airplanes1', 'airplanes2'],
            JWTAudience.enum['catalyst:gateway'],
            testContext
        );

        const response = await SELF.fetch('https://data-channel-gateway/validate-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                {
                    claimId: 'airplanes1',
                    catalystToken: token,
                },
                {
                    claimId: 'airplanes2',
                    catalystToken: token,
                },
            ]),
        });

        expect(response.status).toBe(200);
        const data = (await response.json()) as ValidateTokenResponse[];
        expect(data).toEqual([
            {
                claimId: 'airplanes1',
                catalystToken: token,
                valid: true,
                error: '',
            },
            {
                claimId: 'airplanes2',
                catalystToken: token,
                valid: true,
                error: '',
            },
        ]);
    });

    it('should handle invalid tokens', async () => {
        const invalidToken = 'invalid-token';
        const response = await SELF.fetch('https://data-channel-gateway/validate-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                {
                    claimId: 'airplanes1',
                    catalystToken: invalidToken,
                },
            ]),
        });

        expect(response.status).toBe(200);
        const data = (await response.json()) as ValidateTokenResponse[];
        expect(data).toEqual([
            {
                claimId: 'airplanes1',
                catalystToken: invalidToken,
                valid: false,
                error: 'Invalid token format',
            },
        ]);
    });

    it('should handle non-existent claim IDs', async (testContext) => {
        const token = await generateCatalystToken(
            TEST_ORG,
            ['airplanes1'],
            JWTAudience.enum['catalyst:gateway'],
            testContext
        );

        const response = await SELF.fetch('https://data-channel-gateway/validate-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                {
                    claimId: 'non-existent-channel',
                    catalystToken: token,
                },
            ]),
        });

        expect(response.status).toBe(200);
        const data = (await response.json()) as ValidateTokenResponse[];
        expect(data).toEqual([
            {
                claimId: 'non-existent-channel',
                catalystToken: token,
                valid: false,
                error: "data channel 'non-existent-channel' not found in available channels",
            },
        ]);
    });

    it('should handle mixed valid and invalid claims', async (testContext) => {
        const token = await generateCatalystToken(
            TEST_ORG,
            ['airplanes1'],
            JWTAudience.enum['catalyst:gateway'],
            testContext
        );
        const invalidToken = 'invalid-token';

        const response = await SELF.fetch('https://data-channel-gateway/validate-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                {
                    claimId: 'airplanes1',
                    catalystToken: token,
                },
                {
                    claimId: 'non-existent-channel',
                    catalystToken: token,
                },
                {
                    claimId: 'airplanes2',
                    catalystToken: invalidToken,
                },
            ]),
        });

        expect(response.status).toBe(200);
        const data = (await response.json()) as ValidateTokenResponse[];
        expect(data).toEqual([
            {
                claimId: 'airplanes1',
                catalystToken: token,
                valid: true,
                error: '',
            },
            {
                claimId: 'non-existent-channel',
                catalystToken: token,
                valid: false,
                error: "data channel 'non-existent-channel' not found in available channels",
            },
            {
                claimId: 'airplanes2',
                catalystToken: invalidToken,
                valid: false,
                error: 'Invalid token format',
            },
        ]);
    });

    it('should reject single-use tokens through validation endpoint', async () => {
        // Create a gateway token first
        const gatewayToken = await generateCatalystToken(
            TEST_ORG,
            ['airplanes1'],
            JWTAudience.enum['catalyst:gateway']
        );

        // Create single-use token directly via authx token API
        const singleUseToken = await env.AUTHX_TOKEN_API.signSingleUseJWT(
            'airplanes1',
            { catalystToken: gatewayToken },
            'default'
        );

        expect(singleUseToken.success).toBe(true);

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

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data[0].valid).toBe(false);
        expect(data[0].error).toBe('Token audience is not valid for gateway access');
    });
});
