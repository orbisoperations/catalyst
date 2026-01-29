/**
 * Shared mock handlers for testing worker functionality
 * Provides utilities for mocking external services like GraphQL endpoints
 */

/**
 * FetchMock-like interface for mocking requests
 * This matches the cloudflare:test FetchMock API
 */
interface MockFetch {
    get: (endpoint: string) => MockInterceptor;
}

interface MockInterceptor {
    intercept: (config: InterceptConfig) => MockReply;
}

interface InterceptConfig {
    path: string;
    method: string;
    body?: (body: unknown) => boolean;
}

interface MockReply {
    reply: (status: number, response: unknown | ((context: { body?: unknown }) => unknown)) => MockPersist;
}

interface MockPersist {
    persist: () => void;
}

/**
 * Creates a mock GraphQL endpoint for testing
 * Handles both SDL introspection queries and data queries
 *
 * Note: This function expects the fetchMock from 'cloudflare:test'
 * to be passed as a parameter to avoid type import issues.
 *
 * @param fetchMock - The FetchMock instance from cloudflare:test
 * @param endpoint - The base URL of the GraphQL endpoint (without /graphql)
 * @param typeDefs - The GraphQL SDL type definitions
 * @param dataStore - Key-value pairs mapping query names to their responses
 *
 * @example
 * ```ts
 * import { fetchMock } from 'cloudflare:test';
 *
 * createMockGraphqlEndpoint(
 *   fetchMock,
 *   'http://localhost:8080',
 *   'type Query { airplanes: String! }',
 *   { airplanes: 'Boeing 747' }
 * );
 * ```
 */
export function createMockGraphqlEndpoint(
    fetchMock: MockFetch,
    endpoint: string,
    typeDefs: string,
    dataStore: Record<string, string | object | number>
): void {
    if (endpoint.includes('/graphql')) {
        endpoint = endpoint.replace('/graphql', '');
    }

    // Mock SDL introspection query
    fetchMock
        .get(endpoint)
        .intercept({
            path: '/graphql',
            method: 'POST',
            body: (body: unknown) => {
                return String(body).includes('_sdl');
            },
        })
        .reply(200, { data: { _sdl: typeDefs } })
        .persist();

    // Mock data queries
    fetchMock
        .get(endpoint)
        .intercept({
            path: '/graphql',
            method: 'POST',
            body: (body: unknown) => {
                // if body includes any of the keys in the dataStore, return true
                const bodyStr = String(body);
                return !bodyStr.includes('_sdl') && Object.keys(dataStore).some(key => bodyStr.includes(key));
            },
        })
        .reply(200, ({ body }: { body?: unknown }) => {
            const bodyStr = body ? String(body) : '';
            return {
                data: Object.keys(dataStore).reduce(
                    (acc, key) => {
                        if (bodyStr.includes(key)) {
                            acc[key] = dataStore[key];
                        }
                        return acc;
                    },
                    {} as Record<string, string | object | number>
                ),
            };
        })
        .persist();
}
