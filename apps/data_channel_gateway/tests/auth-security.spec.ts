// auth-security.spec.ts
// Security-focused tests for authentication failure handling
import { DataChannel, JWTAudience, z } from '@catalyst/schemas';
import { env, fetchMock, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, TestContext } from 'vitest';
import { createMockGraphqlEndpoint, generateCatalystToken, TEST_ORG } from './testUtils';

// Zod schemas for runtime validation of GraphQL responses
const GraphQLFieldSchema = z.object({
    name: z.string(),
});

const IntrospectionResponseSchema = z.object({
    data: z.object({
        __type: z.object({
            fields: z.array(GraphQLFieldSchema),
        }),
    }),
});

const MixedQueryResponseSchema = z.object({
    data: z.object({
        workingField: z.string(),
        health: z.string(),
    }),
});

describe('Authentication Security Tests', () => {
    beforeEach(() => {
        fetchMock.activate();
        fetchMock.disableNetConnect();
    });

    afterEach(() => {
        fetchMock.deactivate();
        fetchMock.assertNoPendingInterceptors();
    });

    describe('1. Timing Attack Prevention', () => {
        it('all auth failure paths should take similar time', async (testContext: TestContext) => {
            const iterations = 20; // More iterations for statistical significance
            const timings: Record<string, number[]> = {
                noAuthHeader: [],
                invalidToken: [],
                noClaims: [],
            };

            // Helper to calculate median
            const calculateMedian = (values: number[]): number => {
                const sorted = [...values].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
            };

            // Helper to calculate percentile
            const calculatePercentile = (values: number[], percentile: number): number => {
                const sorted = [...values].sort((a, b) => a - b);
                const index = Math.ceil((percentile / 100) * sorted.length) - 1;
                return sorted[index];
            };

            // Helper to measure timing
            const measureTiming = async (name: keyof typeof timings, fn: () => Promise<Response>) => {
                const start = performance.now();
                await fn();
                const end = performance.now();
                timings[name].push(end - start);
            };

            // Pre-generate token outside timing loop to avoid token generation variance
            const tokenWithNonExistentClaim = await generateCatalystToken(
                TEST_ORG,
                ['non-existent-channel-timing'],
                JWTAudience.enum['catalyst:gateway'],
                testContext
            );

            for (let i = 0; i < iterations; i++) {
                // Test 1: No auth header
                await measureTiming('noAuthHeader', () =>
                    SELF.fetch('https://data-channel-gateway/graphql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: '{ health }' }),
                    })
                );

                // Test 2: Invalid token format
                await measureTiming('invalidToken', () =>
                    SELF.fetch('https://data-channel-gateway/graphql', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: 'Bearer invalid-token-format',
                        },
                        body: JSON.stringify({ query: '{ health }' }),
                    })
                );

                // Test 3: Token with non-existent claims (no accessible channels)
                await measureTiming('noClaims', () =>
                    SELF.fetch('https://data-channel-gateway/graphql', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${tokenWithNonExistentClaim}`,
                        },
                        body: JSON.stringify({ query: '{ health }' }),
                    })
                );
            }

            // Calculate medians (more robust than averages)
            const medians = Object.entries(timings).reduce(
                (acc, [key, values]) => {
                    acc[key] = calculateMedian(values);
                    return acc;
                },
                {} as Record<string, number>
            );

            // Calculate p95 for each scenario
            const p95s = Object.entries(timings).reduce(
                (acc, [key, values]) => {
                    acc[key] = calculatePercentile(values, 95);
                    return acc;
                },
                {} as Record<string, number>
            );

            console.log('Median timings (ms):', medians);
            console.log('P95 timings (ms):', p95s);

            // Use medians to reduce outlier impact
            const medianValues = Object.values(medians);
            const maxMedian = Math.max(...medianValues);
            const minMedian = Math.min(...medianValues);
            const timingDifference = maxMedian - minMedian;

            console.log('Median timing difference:', timingDifference, 'ms');

            // Threshold: 500ms accounts for:
            // - Cloudflare Workers environment variance
            // - Schema creation operations
            // - Network stack differences
            // While still catching significant timing leaks (e.g., 1000ms+ differences)
            const threshold = process.env.CI ? 1000 : 500;
            expect(timingDifference).toBeLessThan(threshold);
        });
    });

    describe('2. Response Uniformity', () => {
        it('auth failures should return appropriate error codes before GraphQL validation', async (testContext: TestContext) => {
            const introspectionQuery = JSON.stringify({
                query: '{ __type(name: "Query") { fields { name } } }',
            });

            // Test 1: No auth header → 401
            const response1 = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: introspectionQuery,
            });
            const json1 = (await response1.json()) as { errors: Array<{ message: string }> };

            // Test 2: Invalid token format → 401
            const response2 = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer invalid-token',
                },
                body: introspectionQuery,
            });
            const json2 = (await response2.json()) as { errors: Array<{ message: string }> };

            // Test 3: Token with non-existent claims → 503 (valid auth, no channels)
            const tokenWithNonExistentClaim = await generateCatalystToken(
                TEST_ORG,
                ['non-existent-claim-response'],
                JWTAudience.enum['catalyst:gateway'],
                testContext
            );
            const response3 = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tokenWithNonExistentClaim}`,
                },
                body: introspectionQuery,
            });
            const json3 = (await response3.json()) as { errors: Array<{ message: string }> };

            // Test 4: Wrong audience token → 401
            const singleUseToken = await env.AUTHX_TOKEN_API.signSingleUseJWT(
                'test-claim',
                { catalystToken: tokenWithNonExistentClaim },
                'default'
            );
            const response4 = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${singleUseToken.token}`,
                },
                body: introspectionQuery,
            });
            const json4 = (await response4.json()) as { errors: Array<{ message: string }> };

            // Invalid auth returns 401
            expect(response1.status).toBe(401);
            expect(response2.status).toBe(401);
            expect(response4.status).toBe(401);

            // Valid auth but no channels returns 503
            expect(response3.status).toBe(503);

            // All error responses should have error messages
            expect(json1.errors[0].message).toContain('Unauthorized');
            expect(json2.errors[0].message).toContain('Unauthorized');
            expect(json3.errors[0].message).toContain('One or more channels currently unavailable');
            expect(json4.errors[0].message).toContain('Unauthorized');

            // 3. Responses are appropriately differentiated by error type (better security posture)
            // Invalid auth errors are consistent
            expect(json1.errors[0].message).toEqual(json2.errors[0].message);
            expect(json2.errors[0].message).toEqual(json4.errors[0].message);
            // But different from the "no channels" error
            expect(json3.errors[0].message).not.toEqual(json1.errors[0].message);
        });
    });

    describe('3. Type Guard - Mixed Success/Failure Permissions', () => {
        it('should correctly handle mixed success/failure channel permissions', async (testContext: TestContext) => {
            // Create two data channels
            const workingChannel: DataChannel = {
                id: 'working-channel',
                name: 'Working Channel',
                endpoint: 'http://working-endpoint/graphql',
                accessSwitch: true,
                description: 'Test working channel',
                creatorOrganization: TEST_ORG,
            };

            const failingChannel: DataChannel = {
                id: 'failing-channel',
                name: 'Failing Channel',
                endpoint: 'http://failing-endpoint/graphql',
                accessSwitch: true,
                description: 'Test failing channel',
                creatorOrganization: TEST_ORG,
            };

            // Register both channels
            const registrarId = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
            const registrar = env.DATA_CHANNEL_REGISTRAR_DO.get(registrarId);

            try {
                await registrar.update(workingChannel);
                await registrar.update(failingChannel);

                // Set up permissions for working channel only
                await env.AUTHX_AUTHZED_API.addOrgToDataChannel(workingChannel.id, TEST_ORG);
                await env.AUTHX_AUTHZED_API.addDataChannelToOrg(TEST_ORG, workingChannel.id);

                // Intentionally NOT setting up permissions for failing channel
                // This will cause splitTokenIntoSingleUseTokens to return mixed results

                // Mock the working endpoint
                createMockGraphqlEndpoint(
                    workingChannel.endpoint,
                    '"""Working GraphQL Server""" type Query { workingField: String! }',
                    { workingField: 'success' }
                );

                // Create token with claims for BOTH channels
                const token = await generateCatalystToken(
                    TEST_ORG,
                    [workingChannel.id, failingChannel.id],
                    JWTAudience.enum['catalyst:gateway'],
                    testContext
                );

                // Query the gateway - it should only include the working channel
                const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        query: '{ __type(name: "Query") { fields { name } } }',
                    }),
                });

                expect(response.status).toBe(200);
                const json = IntrospectionResponseSchema.parse(await response.json());

                // Should have health + workingField (but NOT failingField)
                expect(json.data.__type.fields).toHaveLength(2);
                const fieldNames = json.data.__type.fields.map((f) => f.name).sort();
                expect(fieldNames).toEqual(['health', 'workingField']);

                // Verify we can actually query the working field
                const queryResponse = await SELF.fetch('https://data-channel-gateway/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        query: '{ workingField, health }',
                    }),
                });

                const queryJson = MixedQueryResponseSchema.parse(await queryResponse.json());
                expect(queryJson.data.workingField).toBe('success');
                expect(queryJson.data.health).toBe('OK');
            } finally {
                // Clean up - always executed even if test fails
                await registrar.delete(workingChannel.id);
                await registrar.delete(failingChannel.id);
                await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel(workingChannel.id, TEST_ORG);
                await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg(TEST_ORG, workingChannel.id);
            }
        });

        it('should handle all channel permissions failing gracefully', async (testContext: TestContext) => {
            // Create a data channel but don't set up permissions
            // Security: This should return 503 (same as all channels unresponsive)
            const channel: DataChannel = {
                id: 'no-perms-channel',
                name: 'No Permissions Channel',
                endpoint: 'http://no-perms-endpoint/graphql',
                accessSwitch: true,
                description: 'Test channel with no permissions',
                creatorOrganization: TEST_ORG,
            };

            const registrarId = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
            const registrar = env.DATA_CHANNEL_REGISTRAR_DO.get(registrarId);

            try {
                await registrar.update(channel);

                // Create token with claim but NO permissions set up
                const token = await generateCatalystToken(
                    TEST_ORG,
                    [channel.id],
                    JWTAudience.enum['catalyst:gateway'],
                    testContext
                );

                // Remove the permissions that generateCatalystToken set up
                await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel(channel.id, TEST_ORG);
                await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg(TEST_ORG, channel.id);

                const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        query: '{ health }',
                    }),
                });

                // Security: Should return 503 (no permissions = no accessible channels)
                expect(response.status).toBe(503);
                const json = await response.json();
                expect(json.errors).toBeDefined();
                expect(json.errors[0].message).toContain('One or more channels currently unavailable');
            } finally {
                // Clean up - always executed even if test fails
                await registrar.delete(channel.id);
            }
        });
    });

    describe('4. Edge Cases - Empty Endpoints Array', () => {
        it('should return 503 when endpoints array is empty', async (testContext: TestContext) => {
            // Create a valid token with claims but no actual channels registered
            const token = await generateCatalystToken(
                TEST_ORG,
                ['non-existent-channel'],
                JWTAudience.enum['catalyst:gateway'],
                testContext
            );

            const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: '{ __type(name: "Query") { fields { name } } }',
                }),
            });

            expect(response.status).toBe(503);
            const json = (await response.json()) as { errors: Array<{ message: string }> };
            expect(json.errors[0].message).toContain('One or more channels currently unavailable');
        });

        it('should return 503 when no channels are accessible', async (testContext: TestContext) => {
            // Create token with non-existent channel (results in empty endpoints)
            const token = await generateCatalystToken(
                TEST_ORG,
                ['non-existent-health-check'],
                JWTAudience.enum['catalyst:gateway'],
                testContext
            );

            const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: '{ health }',
                }),
            });

            expect(response.status).toBe(503);
            const json = (await response.json()) as { errors: Array<{ message: string }> };
            expect(json.errors[0].message).toContain('One or more channels currently unavailable');
        });

        it('should return 503 before validating query when no channels are accessible', async (testContext: TestContext) => {
            // Create token with non-existent channel (results in empty endpoints)
            const token = await generateCatalystToken(
                TEST_ORG,
                ['non-existent-field-check'],
                JWTAudience.enum['catalyst:gateway'],
                testContext
            );

            const response = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: '{ nonExistentField }',
                }),
            });

            // Should return 503 before GraphQL validation
            expect(response.status).toBe(503);
            const json = (await response.json()) as { errors: Array<{ message: string }> };
            expect(json.errors[0].message).toContain('One or more channels currently unavailable');
        });

        it('should handle empty endpoints consistently regardless of auth failure reason', async (testContext: TestContext) => {
            // Scenario 1: Single non-existent channel
            const token1 = await generateCatalystToken(
                TEST_ORG,
                ['unregistered-single-channel'],
                JWTAudience.enum['catalyst:gateway'],
                testContext
            );
            const response1 = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token1}`,
                },
                body: JSON.stringify({ query: '{ health }' }),
            });
            const json1 = (await response1.json()) as { errors: Array<{ message: string }> };

            // Scenario 2: Multiple non-existent channels
            const token2 = await generateCatalystToken(
                TEST_ORG,
                ['unregistered-channel-1', 'unregistered-channel-2'],
                JWTAudience.enum['catalyst:gateway'],
                testContext
            );
            const response2 = await SELF.fetch('https://data-channel-gateway/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token2}`,
                },
                body: JSON.stringify({ query: '{ health }' }),
            });
            const json2 = (await response2.json()) as { errors: Array<{ message: string }> };

            // Both should return 503 Service Unavailable with identical error messages
            expect(response1.status).toBe(503);
            expect(response2.status).toBe(503);
            expect(json1.errors[0].message).toContain('One or more channels currently unavailable');
            expect(json2.errors[0].message).toContain('One or more channels currently unavailable');
        });
    });
});
