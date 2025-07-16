/* eslint-disable */
// @ts-ignore – vitest types resolved at runtime via node resolution
import { test, expect } from 'vitest';
import type { D1Database, Queue } from '@cloudflare/workers-types';
import app from '../src/server';

// Re-use minimal D1 mock from existing tests
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

test('insert mutation enqueues job in JOB_QUEUE', async () => {
    const messages: string[] = [];
    const mockQueue: Queue = {
        // Only send is required for this test
        send: async (msg: string | ArrayBuffer | FormData) => {
            messages.push(typeof msg === 'string' ? msg : String(msg));
        },
    } as unknown as Queue;

    const query = /* GraphQL */ `
        mutation InsertJob {
            insertIntoJobsSingle(values: { jobId: "job-test-1" }) {
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
        { DB: createMockD1(), JOB_QUEUE: mockQueue }
    );

    expect(res.status).toBe(200);
    expect(messages.length).toBe(1);
    const parsed = JSON.parse(messages[0]!);
    expect(parsed.jobId).toBe('job-test-1');
});

test('update mutation with disallowed fields returns error', async () => {
    const query = /* GraphQL */ `
        mutation BadUpdate {
            updateJobsCollection(filter: { jobId: { eq: "job1" } }, set: { submittedTimestamp: 123 }) {
                affectedRows
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
        { DB: createMockD1(), JOB_QUEUE: undefined as unknown as Queue }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { errors?: unknown };
    expect(body.errors).toBeDefined();
});
