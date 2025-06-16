import { fetchMock } from 'cloudflare:test';
import { graphql } from 'graphql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeGatewaySchema } from '../src/index';
import { createMockGraphqlEndpoint, generateCatalystToken } from './testUtils';

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
    fetchMock.assertNoPendingInterceptors();
    fetchMock.deactivate();
});

describe('Schema fetching resilience', () => {
    it('should handle partial failures with Promise.allSettled', async (ctx) => {
        // create mock graphql endpoint for working endpoint
        const token = await generateCatalystToken('test', ['test-claim'], ctx, 'test_user@mail.com');
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
        const token = await generateCatalystToken('test', ['test-claim'], ctx, 'test_user@mail.com');
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
        // Mock endpoints - one working, one failing
        const token = await generateCatalystToken('test', ['test-claim'], ctx, 'test_user@mail.com');
        const endpoints = [
            { token, endpoint: 'http://failing-endpoint/graphql' },
            { token, endpoint: 'http://failing-endpoint-2/graphql' },
        ];

        const schema = await makeGatewaySchema(endpoints);

        // @ts-expect-error: stiching info is not typed
        expect(schema.extensions.stitchingInfo.subschemaMap.size).toBe(0);

        // Verify the schema was created (should have the health query)
        const queryType = schema.getQueryType();
        expect(queryType).toBeDefined();
        expect(queryType?.getFields()).toHaveProperty('health');

        // Verify we can execute a query
        // currently graphql specificaiton defines that if at least on value is not defined, the query should fail
        // the stiching directive will fail on the "onValidate" query hook
        // due to the nonExisting field
        const result = await graphql({
            schema,
            source: '{ health, nonExistentField }',
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.length).toBe(1);
    });

    it('should gracefully handle a 500 server error from a data channel', async (ctx) => {
        const token = await generateCatalystToken('test', ['test-claim'], ctx, 'test_user@mail.com');
        const endpoints = [
            { token, endpoint: 'http://failing-endpoint-500/graphql' },
            { token, endpoint: 'http://working-endpoint/graphql' },
        ];

        // Mock the failing endpoint to return a 500 error
        fetchMock
            .get('http://failing-endpoint-500')
            .intercept({
                path: '/graphql',
                method: 'POST',
                body: (body) => body.toString().includes('_sdl'),
            })
            .reply(500, 'Internal Server Error');

        // Mock the working endpoint
        createMockGraphqlEndpoint(
            'http://working-endpoint',
            '"""Working GraphQL Server""" type Query { workingGraphqlField: String! }',
            {
                workingGraphqlField: 'dummy-value',
            }
        );

        const schema = await makeGatewaySchema(endpoints);

        // @ts-expect-error: stiching info is not typed
        expect(schema.extensions.stitchingInfo.subschemaMap.size).toBe(1);

        const queryType = schema.getQueryType();
        expect(queryType).toBeDefined();
        const fields = queryType?.getFields();
        expect(fields).toHaveProperty('health');
        expect(fields).toHaveProperty('workingGraphqlField');

        const result = await graphql({
            schema,
            source: '{ workingGraphqlField, health }',
        });

        expect(result).toEqual({
            data: { health: 'OK', workingGraphqlField: 'dummy-value' },
        });

        // Querying for a field from the failed schema should result in an error
        const failedResult = await graphql({
            schema,
            source: '{ failingField }',
        });
        expect(failedResult.errors).toBeDefined();
        expect(failedResult.errors?.[0].message).toBe('Cannot query field "failingField" on type "Query".');
    });

    it('should gracefully handle a non-JSON response from a data channel', async (ctx) => {
        const token = await generateCatalystToken('test', ['test-claim'], ctx, 'test_user@mail.com');
        const endpoints = [
            { token, endpoint: 'http://non-json-endpoint/graphql' },
            { token, endpoint: 'http://working-endpoint/graphql' },
        ];

        // Mock the endpoint to return a non-JSON response
        fetchMock
            .get('http://non-json-endpoint')
            .intercept({
                path: '/graphql',
                method: 'POST',
                body: (body) => body.toString().includes('_sdl'),
            })
            .reply(200, '<h1>This is not JSON</h1>', {
                headers: { 'Content-Type': 'text/html' },
            });

        // Mock the working endpoint
        createMockGraphqlEndpoint(
            'http://working-endpoint',
            '"""Working GraphQL Server""" type Query { workingGraphqlField: String! }',
            {
                workingGraphqlField: 'dummy-value',
            }
        );

        const schema = await makeGatewaySchema(endpoints);

        // @ts-expect-error: stiching info is not typed
        expect(schema.extensions.stitchingInfo.subschemaMap.size).toBe(1);

        const queryType = schema.getQueryType();
        expect(queryType).toBeDefined();
        const fields = queryType?.getFields();
        expect(fields).toHaveProperty('health');
        expect(fields).toHaveProperty('workingGraphqlField');

        const result = await graphql({
            schema,
            source: '{ workingGraphqlField, health }',
        });

        expect(result).toEqual({
            data: { health: 'OK', workingGraphqlField: 'dummy-value' },
        });

        // Querying for a field from the failed schema should result in an error
        const failedResult = await graphql({
            schema,
            source: '{ nonExistentField }',
        });
        expect(failedResult.errors).toBeDefined();
        expect(failedResult.errors?.[0].message).toBe('Cannot query field "nonExistentField" on type "Query".');
    });
});
