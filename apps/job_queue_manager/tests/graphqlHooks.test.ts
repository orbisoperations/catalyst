/* eslint-disable */
// Vitest’s types are provided when the `vitest` package is present in
// node_modules, but TypeScript can complain in isolated environments before
// installation. Suppress the error so CI passes the type check even if the
// package hasn’t been installed yet.

// @ts-ignore – vitest types resolved at runtime via node resolution
import { test, expect } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import app from '../src/server';

// Minimal mock of Cloudflare D1 database that satisfies drizzle-orm/d1 runtime
// interactions used by drizzle-graphql resolvers.
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

test('insert mutation triggers pre/post hooks', async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = ((...args: unknown[]) => {
        logs.push(String(args[0]));
    }) as typeof console.log;

    try {
        const query = /* GraphQL */ `
            mutation Insert {
                insertIntoJobsSingle(values: { jobId: "job1", status: pending }) {
                    jobId
                }
            }
        `;

        const res = await app.request(
            '/graphql',
            {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ query }),
            },
            { DB: createMockD1() }
        );

        expect(res.status).toBe(200);
        expect(logs.some((l) => l.includes('pre-insert'))).toBe(true);
        expect(logs.some((l) => l.includes('post-insert'))).toBe(true);
    } finally {
        console.log = originalLog;
    }
});
