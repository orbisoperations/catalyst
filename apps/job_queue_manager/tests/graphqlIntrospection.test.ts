/* eslint-disable */
// Bun’s test runner provides the `bun:test` module at runtime, but TypeScript
// doesn’t recognise it unless `bun-types` are installed. Silence the error so
// the code still type-checks during CI.
// Vitest’s types are provided when the `vitest` package is present in
// node_modules, but TypeScript can complain in isolated environments before
// installation. Suppress the error so CI passes the type check even if the
// package hasn’t been installed yet.

// @ts-ignore – vitest types resolved at runtime via node resolution
import { test, expect } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import app from '../src/server';

// Re-use the minimal Cloudflare D1 mock from the other test file so that all
// resolver code paths that hit the database continue to work without a real
// database. We keep the implementation in-line here to avoid a cross-file
// dependency for something so small.
function createMockD1(): D1Database {
    const dummyResult = { success: true, results: [] };
    const mockPrepared = {
        bind: () => mockPrepared,
        all: async () => dummyResult,
        run: async () => dummyResult,
        raw: async () => dummyResult,
        first: async () => null,
    };
    return {
        prepare: () => mockPrepared,
        batch: async () => [],
        exec: async () => dummyResult,
    } as unknown as D1Database;
}

test('GraphQL introspection query returns a schema', async () => {
    const introspectionQuery = /* GraphQL */ `
        query IntrospectionQuery {
            __schema {
                queryType {
                    name
                }
                mutationType {
                    name
                }
                types {
                    name
                }
            }
        }
    `;

    const res = await app.request(
        '/graphql',
        {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ query: introspectionQuery }),
        },
        { DB: createMockD1() }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
        data: { __schema: { types: unknown[] } };
        errors?: unknown;
    };
    expect(body.errors).toBeUndefined();
    expect(body.data.__schema.types.length).toBeGreaterThan(0);
});
