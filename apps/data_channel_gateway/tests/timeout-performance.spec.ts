import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeGatewaySchema } from '../src/index';

// Mock data channels with different response times - REDUCED for faster testing
const SLOW_DATA_CHANNELS = [
    {
        id: 'slow-channel-1',
        endpoint: 'https://slow-channel-1.fly.dev',
        responseTime: 3000, // 3 seconds - will cause timeout (exceeds 2s timeout)
    },
    {
        id: 'slow-channel-2',
        endpoint: 'https://slow-channel-2.fly.dev',
        responseTime: 1200, // 1.2 seconds - slow but not timeout (reduced from 8s)
    },
    {
        id: 'fast-channel-1',
        endpoint: 'https://fast-channel-1.fly.dev',
        responseTime: 200, // 0.2 seconds - fast (reduced from 1s)
    },
    {
        id: 'fast-channel-2',
        endpoint: 'https://fast-channel-2.fly.dev',
        responseTime: 100, // 0.1 seconds - very fast (reduced from 0.5s)
    },
];

// Test timeout configuration - much shorter for faster tests
const TEST_TIMEOUT_MS = 2000; // 2 seconds instead of 10 seconds

let originalFetch: typeof globalThis.fetch;

describe('Timeout Performance Tests - Overriding default of 10s with 2s timeout for fast testing', () => {
    beforeAll(() => {
        originalFetch = globalThis.fetch;
        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
            const channel = SLOW_DATA_CHANNELS.find((c) => urlStr.startsWith(`${c.endpoint}`));
            if (channel && init?.method === 'POST') {
                const mockSchema = `
                    type Query {
                        ${channel.id.replace(/[^a-zA-Z0-9_]/g, '_')}: String!
                        _sdl: String!
                    }
                `;
                await new Promise((resolve) => setTimeout(resolve, channel.responseTime));
                return new Response(JSON.stringify({ data: { _sdl: mockSchema } }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            // fallback to original fetch for anything else
            return originalFetch(input, init);
        };
    });

    afterAll(() => {
        globalThis.fetch = originalFetch;
    });

    it('should PASS: makeGatewaySchema with slow data channels takes less than 3 seconds', async () => {
        console.log('Starting timeout performance test for makeGatewaySchema...');
        console.log('This test should PASS after timeout fix (response time < 3s)');
        console.log('Slow channels configured:');
        SLOW_DATA_CHANNELS.forEach((ch) => {
            console.log(`  - ${ch.id}: ${ch.responseTime}ms delay`);
        });

        const endpoints = SLOW_DATA_CHANNELS.map((channel) => ({
            token: `test-token-${channel.id}`,
            endpoint: `${channel.endpoint}/graphql`,
        }));

        const startTime = Date.now();

        // This is the core function that should be slow with current implementation
        const schema = await makeGatewaySchema(endpoints, { timeoutMs: TEST_TIMEOUT_MS });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        console.log(`makeGatewaySchema response time: ${responseTime}ms`);
        console.log(`Expected: <3000ms (after timeout fix)`);
        console.log(`Actual: ${responseTime}ms`);

        // This test should PASS after timeout fix - the response time should be < 3 seconds
        // because slow channels will timeout at 2s instead of waiting 3s
        expect(responseTime).toBeLessThan(3000);

        console.log('✅ Test PASSED - response time was <3s as expected after timeout fix');
        console.log('Schema built successfully:', !!schema);
    }, 15000); // 15 second timeout (reduced from 60s)

    it('should demonstrate that response time scales with slowest data channel', async () => {
        // Test with only fast channels
        const fastEndpoints = SLOW_DATA_CHANNELS.filter((c) => c.responseTime < 500).map((channel) => ({
            token: `test-token-${channel.id}`,
            endpoint: `${channel.endpoint}/graphql`,
        }));

        const fastStartTime = Date.now();
        const fastSchema = await makeGatewaySchema(fastEndpoints, { timeoutMs: TEST_TIMEOUT_MS });
        const fastEndTime = Date.now();
        const fastResponseTime = fastEndTime - fastStartTime;

        expect(fastSchema).toBeDefined();

        // Test with mixed fast and slow channels
        const mixedEndpoints = SLOW_DATA_CHANNELS.map((channel) => ({
            token: `test-token-${channel.id}`,
            endpoint: `${channel.endpoint}/graphql`,
        }));

        const mixedStartTime = Date.now();
        const mixedSchema = await makeGatewaySchema(mixedEndpoints, { timeoutMs: TEST_TIMEOUT_MS });
        const mixedEndTime = Date.now();
        const mixedResponseTime = mixedEndTime - mixedStartTime;

        expect(mixedSchema).toBeDefined();

        console.log(`Fast channels only response time: ${fastResponseTime}ms`);
        console.log(`Mixed fast/slow channels response time: ${mixedResponseTime}ms`);
        console.log(`Performance degradation: ${mixedResponseTime / fastResponseTime}x slower`);

        // This test should PASS - the mixed channels should be much slower
        // because the slowest channel (3s) dominates the response time
        expect(mixedResponseTime).toBeGreaterThan(fastResponseTime * 5);

        console.log('✅ Test PASSED - mixed channels were significantly slower as expected');
    }, 15000); // 15 second timeout

    it('should include only non-timed-out channels in the final schema', async () => {
        console.log('Testing schema content to verify timeout behavior...');

        const endpoints = SLOW_DATA_CHANNELS.map((channel) => ({
            token: `test-token-${channel.id}`,
            endpoint: `${channel.endpoint}/graphql`,
        }));

        const schema = await makeGatewaySchema(endpoints, { timeoutMs: TEST_TIMEOUT_MS });
        expect(schema).toBeDefined();

        // Check that fast channels (under 2s) are included
        const fastChannels = SLOW_DATA_CHANNELS.filter((c) => c.responseTime < TEST_TIMEOUT_MS);
        const slowChannels = SLOW_DATA_CHANNELS.filter((c) => c.responseTime >= TEST_TIMEOUT_MS);

        console.log(
            'Fast channels (should be included):',
            fastChannels.map((c) => c.id)
        );
        console.log(
            'Slow channels (should be excluded due to timeout):',
            slowChannels.map((c) => c.id)
        );

        // Verify that fast channels are included in the schema
        fastChannels.forEach((channel) => {
            const queryType = schema.getQueryType();
            if (queryType) {
                const fields = queryType.getFields();
                const fieldNameExpected = channel.id.replace(/[^a-zA-Z0-9_]/g, '_');
                const hasField = Object.keys(fields).includes(fieldNameExpected);
                console.log(`Channel ${channel.id} (${channel.responseTime}ms): ${hasField ? 'INCLUDED' : 'MISSING'}`);
                expect(hasField).toBe(true);
            }
        });

        // Verify that slow channels are NOT included in the schema (due to timeout)
        slowChannels.forEach((channel) => {
            const queryType = schema.getQueryType();
            if (queryType) {
                const fields = queryType.getFields();
                const fieldNameExpected = channel.id.replace(/[^a-zA-Z0-9_]/g, '_');
                const hasField = Object.keys(fields).includes(fieldNameExpected);
                console.log(
                    `Channel ${channel.id} (${channel.responseTime}ms): ${hasField ? 'INCLUDED (UNEXPECTED)' : 'EXCLUDED (EXPECTED)'}`
                );
                expect(hasField).toBe(false);
            }
        });

        // Verify we have the expected number of channels
        const queryType = schema.getQueryType();
        if (queryType) {
            const fields = queryType.getFields();
            console.log(`Total fields in schema: ${Object.keys(fields).length}`);
            console.log(`Available fields: ${Object.keys(fields).join(', ')}`);

            // Verify the health field is present
            const hasHealthField = Object.keys(fields).includes('health');
            console.log(`Health field present: ${hasHealthField}`);
            expect(hasHealthField).toBe(true);
        }

        console.log('✅ Test PASSED - schema correctly includes only non-timed-out channels');
    }, 15000); // 15 second timeout (reduced from 60s)
});
