import { fetchMock } from 'cloudflare:test';
import { graphql } from 'graphql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeGatewaySchema } from '../src/index';
import { createMockGraphqlEndpoint, generateCatalystToken } from './testUtils';
import { JWTAudience } from '@catalyst/schemas';

// Docs for fetchMock and request mocking:
// https://blog.cloudflare.com/workers-vitest-integration/

beforeEach(() => {
    // activete workerd runtime fetch mocker
    fetchMock.activate();

    // disable network connection
    // will throw an error if all fetchMock fallthrough fails
    // any network connection is made
    fetchMock.disableNetConnect();
});

afterEach(() => {
    fetchMock.deactivate();
    fetchMock.assertNoPendingInterceptors();
});

describe('Schema fetching resilience', () => {
    it('should handle partial failures with Promise.allSettled', async (ctx) => {
        // create mock graphql endpoint for working endpoint
        const token = await generateCatalystToken(
            'test',
            ['test-claim'],
            JWTAudience.enum['catalyst:gateway'],
            ctx,
            'test_user@mail.com'
        );
        const endpoints = [
            { token, endpoint: 'http://failing-endpoint/graphql' },
            { token, endpoint: 'http://working-endpoint/graphql' },
        ];
        createMockGraphqlEndpoint(
            'http://working-endpoint',
            '"""Working GraphQL Server""" type Query { workingGraphqlField: String! }',
            {
                workingGraphqlField: 'dummy-value',
            }
        );
        // Mock endpoints - one working, one failing
        const schema = await makeGatewaySchema(endpoints);

        // @ts-expect-error: stiching info is not typed
        expect(schema.extensions.stitchingInfo.subschemaMap.size).toBe(1);

        // Verify the schema was created (should have the health query)
        const queryType = schema.getQueryType();
        expect(queryType).toBeDefined();
        expect(queryType?.getFields()).toHaveProperty('health');

        // Verify we can execute a query
        const result = await graphql({
            schema,
            source: '{ workingGraphqlField, health }',
        });

        expect(result).toEqual({
            data: { health: 'OK', workingGraphqlField: 'dummy-value' },
        });
    });

    it('should handle no failures with Promise.allSettled', async (ctx) => {
        // Mock endpoints - one working, one failing
        const token = await generateCatalystToken(
            'test',
            ['test-claim'],
            JWTAudience.enum['catalyst:gateway'],
            ctx,
            'test_user@mail.com'
        );
        const endpoints = [
            { token, endpoint: 'http://working-endpoint-1/graphql' },
            { token, endpoint: 'http://working-endpoint-2/graphql' },
        ];
        // create mock graphql endpoint for working endpoint
        createMockGraphqlEndpoint(
            'http://working-endpoint-1',
            '"""Working GraphQL Server 3""" type Query { workingGraphqlField: String! }',
            {
                workingGraphqlField: 'dummy-value',
            }
        );
        // create mock graphql endpoint for working endpoint
        createMockGraphqlEndpoint(
            'http://working-endpoint-2',
            '"""Working GraphQL Server 2""" type Query { extraField: String!\n extraNumber: Int! }',
            {
                extraField: 'dummy-value',
                extraNumber: 123,
            }
        );

        const schema = await makeGatewaySchema(endpoints);
        // @ts-expect-error: stiching info is not typed
        console.log('schema from test', schema.extensions.stitchingInfo.subschemaMap);

        // @ts-expect-error: stiching info is not typed
        expect(schema.extensions.stitchingInfo.subschemaMap.size).toBe(2);

        // Verify the schema was created (should have the health query)
        const queryType = schema.getQueryType();
        expect(queryType).toBeDefined();
        expect(queryType?.getFields()).toHaveProperty('health');

        // Verify we can execute a query
        const result = await graphql({
            schema,
            source: '{ extraField, health, workingGraphqlField, extraNumber }',
        });

        expect(result).toEqual({
            data: {
                health: 'OK',
                extraField: 'dummy-value',
                extraNumber: 123,
                workingGraphqlField: 'dummy-value',
            },
        });
    });

    it('should handle all failures with Promise.allSettled', async (ctx) => {
        // Mock endpoints - all failing
        // Security: When all channels fail, throw error (returns 503, same as unshared channels)
        const token = await generateCatalystToken(
            'test',
            ['test-claim'],
            JWTAudience.enum['catalyst:gateway'],
            ctx,
            'test_user@mail.com'
        );
        const endpoints = [
            { token, endpoint: 'http://failing-endpoint/graphql' },
            { token, endpoint: 'http://failing-endpoint-2/graphql' },
        ];

        // Expect error when all channels fail
        await expect(makeGatewaySchema(endpoints)).rejects.toThrow('All data channels unavailable during schema fetch');
    });

    it('should gracefully handle a 500 server error from a data channel', async (ctx) => {
        const token = await generateCatalystToken(
            'test',
            ['test-claim'],
            JWTAudience.enum['catalyst:gateway'],
            ctx,
            'test_user@mail.com'
        );
        const endpoints = [
            { token, endpoint: 'http://failing-endpoint/graphql' },
            { token, endpoint: 'http://my-working-endpoint-1/graphql' },
        ];

        // Mock the failing endpoint to return a 500 error
        fetchMock
            .get('http://failing-endpoint')
            .intercept({
                path: '/graphql',
                method: 'POST',
            })
            .reply(500, 'Internal Server Error');

        createMockGraphqlEndpoint(
            'http://my-working-endpoint-1',
            '"""Working GraphQL Server""" type Query { workingGraphqlField: String! }',
            {
                workingGraphqlField: 'dummy-value',
            }
        );
        // Mock endpoints - one working, one failing
        const schema = await makeGatewaySchema(endpoints);

        // @ts-expect-error: stiching info is not typed
        expect(schema.extensions.stitchingInfo.subschemaMap.size).toBe(1);

        // Verify the schema was created (should have the health query)
        const queryType = schema.getQueryType();
        expect(queryType).toBeDefined();
        expect(queryType?.getFields()).toHaveProperty('health');

        // Verify we can execute a query against the partial schema.
        const result = await graphql({
            schema,
            source: '{ workingGraphqlField, health }',
        });

        expect(result).toEqual({
            data: { health: 'OK', workingGraphqlField: 'dummy-value' },
        });

        expect(result.errors).toBeUndefined();

        const failingResult = await graphql({
            schema,
            source: '{ health, nonExistentField }',
        });

        expect(failingResult.errors).toBeDefined();
        expect(failingResult.errors?.length).toBe(1);
    });

    it('should gracefully handle a non-JSON response from a data channel', async (ctx) => {
        const token = await generateCatalystToken(
            'test',
            ['test-claim'],
            JWTAudience.enum['catalyst:gateway'],
            ctx,
            'test_user@mail.com'
        );
        const endpoints = [
            { token, endpoint: 'http://failing-endpoint/graphql' },
            { token, endpoint: 'http://my-working-endpoint-2/graphql' },
        ];

        // Mock the endpoint to return a non-JSON response
        fetchMock
            .get('http://failing-endpoint')
            .intercept({
                path: '/graphql',
                method: 'POST',
            })
            .reply(200, '<h1>This is not JSON</h1>', {
                headers: { 'Content-Type': 'text/html' },
            });

        createMockGraphqlEndpoint(
            'http://my-working-endpoint-2',
            '"""Working GraphQL Server""" type Query { workingGraphqlField: String! }',
            {
                workingGraphqlField: 'dummy-value',
            }
        );
        // Mock endpoints - one working, one failing
        const schema = await makeGatewaySchema(endpoints);

        // @ts-expect-error: stiching info is not typed
        expect(schema.extensions.stitchingInfo.subschemaMap.size).toBe(1);

        // Verify the schema was created (should have the health query)
        const queryType = schema.getQueryType();
        expect(queryType).toBeDefined();
        expect(queryType?.getFields()).toHaveProperty('health');

        // Verify we can execute a query against the partial schema.
        const result = await graphql({
            schema,
            source: '{ workingGraphqlField, health }',
        });

        expect(result).toEqual({
            data: { health: 'OK', workingGraphqlField: 'dummy-value' },
        });
        expect(result.errors).toBeUndefined();

        const failingResult = await graphql({
            schema,
            source: '{ health, nonExistentField }',
        });

        expect(failingResult.errors).toBeDefined();
        expect(failingResult.errors?.length).toBe(1);
    });
});
