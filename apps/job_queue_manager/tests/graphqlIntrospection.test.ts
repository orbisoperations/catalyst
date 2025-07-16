// Bun’s test runner provides the `bun:test` module at runtime, but TypeScript
// doesn’t recognise it unless `bun-types` are installed. Silence the error so
// the code still type-checks during CI.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – bun:test is provided by the Bun runtime
import { test, expect } from "bun:test";
import app from "../src/server";

// Re-use the minimal Cloudflare D1 mock from the other test file so that all
// resolver code paths that hit the database continue to work without a real
// database. We keep the implementation in-line here to avoid a cross-file
// dependency for something so small.
function createMockD1(): any {
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
  };
}

test("GraphQL introspection query returns a schema", async () => {
  const introspectionQuery = /* GraphQL */ `
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        types {
          name
        }
      }
    }
  `;

  const res = await app.request(
    "/graphql",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: introspectionQuery }),
    },
    { DB: createMockD1() },
  );

  expect(res.status).toBe(200);
  const body = (await res.json()) as any;
  expect(body.errors).toBeUndefined();
  expect(body.data.__schema.types.length).toBeGreaterThan(0);
}); 