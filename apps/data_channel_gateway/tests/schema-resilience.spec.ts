import { describe, expect, it } from 'vitest';
import { parse, buildSchema } from 'graphql';
import { graphql } from 'graphql';
import { fetchRemoteSchema, makeGatewaySchema } from '../src/index';

describe('Schema fetching resilience', () => {
    it('should handle partial failures with Promise.allSettled', async () => {
        // Mock endpoints - one working, one failing
        const endpoints = [
            { endpoint: 'http://working-endpoint/graphql' },
            { endpoint: 'http://failing-endpoint/graphql' }
        ];

        // Mock token
        const token = 'test-token';

        // Mock fetchRemoteSchema to simulate one success and one failure
        const originalFetchRemoteSchema = fetchRemoteSchema;
        (global as any).fetchRemoteSchema = async (executor: any) => {
            const result = await executor({
                document: parse(/* GraphQL */ `{ _sdl }`),
            });
            
            // Simulate failure for the failing endpoint
            if (result.url.includes('failing-endpoint')) {
                throw new Error('Failed to fetch schema');
            }
            
            return buildSchema('type Query { test: String }');
        };

        try {
            const schema = await makeGatewaySchema(endpoints, token);
            
            // Verify the schema was created (should have the health query)
            const queryType = schema.getQueryType();
            expect(queryType).toBeDefined();
            expect(queryType?.getFields()).toHaveProperty('health');
            
            // Verify we can execute a query
            const result = await graphql({
                schema,
                source: '{ health }'
            });
            
            expect(result).toEqual({ data: { health: 'OK' } });
        } finally {
            // Restore original function
            (global as any).fetchRemoteSchema = originalFetchRemoteSchema;
        }
    });
}); 