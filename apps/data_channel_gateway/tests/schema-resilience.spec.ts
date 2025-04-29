import { describe, expect, it, vi } from 'vitest';
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

        // Mock fetch responses
        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url.includes('working-endpoint')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        data: {
                            _sdl: 'type Query { test: String }'
                        }
                    })
                });
            } else if (url.includes('failing-endpoint')) {
                return Promise.resolve({
                    ok: false,
                    status: 500,
                    json: () => Promise.resolve({
                        error: 'Internal Server Error'
                    })
                });
            }
            throw new Error('Unexpected endpoint called');
        });

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
            // Restore original fetch
            global.fetch = originalFetch;
        }
    });
}); 