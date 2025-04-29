import { fetchMock } from 'cloudflare:test';
import { graphql } from 'graphql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeGatewaySchema } from '../src/index';

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

const createMockGraphqlEndpoint = (
    endpoint: string,
    typeDefs: string,
    dataStore: Record<string, any>
) => {
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
                    Object.keys(dataStore).some((key) =>
                        body.toString().includes(key)
                    )
                );
            },
        })
        .reply(200, ({ body }) => {
            return {
                data: Object.keys(dataStore).reduce((acc, key) => {
                    if (body?.toString().includes(key)) {
                        acc[key] = dataStore[key];
                    }
                    return acc;
                }, {}),
            };
        })
        .persist();
};

describe('Schema fetching resilience', () => {
    it('should handle partial failures with Promise.allSettled', async () => {
        // Mock endpoints - one working, one failing
        const endpoints = [
            { endpoint: 'http://failing-endpoint/graphql' },
            { endpoint: 'http://working-endpoint/graphql' },
        ];

        // Mock token
        const token = 'test-token';

        // create mock graphql endpoint for working endpoint
        createMockGraphqlEndpoint(
            'http://working-endpoint',
            '"""Working GraphQL Server""" type Query { workingGraphqlField: String! }',
            {
                workingGraphqlField: 'dummy-value',
            }
        );

        const schema = await makeGatewaySchema(endpoints, token);

        // @ts-ignore: stiching info is not typed
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

    it('should handle no failures with Promise.allSettled', async () => {
        // Mock endpoints - one working, one failing
        const endpoints = [
            { endpoint: 'http://working-endpoint-1/graphql' },
            { endpoint: 'http://working-endpoint-2/graphql' },
        ];

        // Mock token
        const token = 'test-token';

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

        const schema = await makeGatewaySchema(endpoints, token);

        // @ts-ignore: stiching info is not typed
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

    it('should handle all failures with Promise.allSettled', async () => {
        // Mock endpoints - one working, one failing
        const endpoints = [
            { endpoint: 'http://failing-endpoint/graphql' },
            { endpoint: 'http://failing-endpoint-2/graphql' },
        ];

        // Mock token
        const token = 'test-token';

        const schema = await makeGatewaySchema(endpoints, token);

        // @ts-ignore: stiching info is not typed
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
});
