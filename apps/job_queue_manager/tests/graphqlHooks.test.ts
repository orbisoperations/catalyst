// Bun provides a built-in test runner. The import below is resolved by Bun at
// runtime but TypeScript doesn’t know about it unless `bun-types` is installed.
// If you don’t have the types, you can install them (`bun add -d bun-types`) or
// simply ignore the error for type-checking purposes.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – bun:test is provided by the Bun runtime
import { test, expect } from "bun:test";
import type { D1Database } from "@cloudflare/workers-types";
import app from "../src/server";

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
  } as D1Database;
}

test("insert mutation triggers pre/post hooks", async () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = ((...args: unknown[]) => {
    logs.push(String(args[0]));
  }) as typeof console.log;

  try {
    const query = /* GraphQL */ `
      mutation Insert {
        insertIntoJobsSingle(
          values: { jobId: "job1", status: pending }
        ) {
          jobId
        }
      }
    `;

    const res = await app.request(
      "/graphql",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      },
      { DB: createMockD1() },
    );

    expect(res.status).toBe(200);
    expect(logs.some((l) => l.includes("pre-insert"))).toBe(true);
    expect(logs.some((l) => l.includes("post-insert"))).toBe(true);
  } finally {
    console.log = originalLog;
  }
}); 
