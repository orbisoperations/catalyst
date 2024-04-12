// test/index.spec.ts

// RUN THIS TO GET IT WORKING
// docker run -v "$(pwd)"/schema.zaml:/schema.zaml:ro  -p 8081:8081 authzed/spicedb serve-testing --http-enabled --skip-release-check=true --log-level debug --load-configs /schema.zaml

import { env, createExecutionContext, waitOnExecutionContext, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import worker from "../src/index";
import { createTRPCClient, httpLink } from '@trpc/client';
import type {AppRouter} from  "../src/router"
import exp from "node:constants";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Authzed Integration via TRPC", () => {
	const client = createTRPCClient<AppRouter>({
		links: [
			httpLink({
				url: 'http://localhost:3000',
				fetch(url, options) {
					return SELF.fetch(url, options)
				}
			}),
		],
	});

	it("health check for service", async () => {
		const resp = await client.health.query()
		expect(resp).toBe("ok")
	})

	describe("testing organization functions", async () => {
		it("add new users to organization", async () => {
			const resp = await client.organization.relations.user.sync.mutate({
				userId: "test-user-1",
				orgId: "test-org-1"
			})

			expect(resp).toBe(true)

		})
	})
  /*&it("responds with Hello World! (unit style)", async () => {
    const request = new IncomingRequest("http://example.com");
    // Create an empty context to pass to `worker.fetch()`.
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
    await waitOnExecutionContext(ctx);
    expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
  });

  it("responds with Hello World! (integration style)", async () => {
   const response = await SELF.fetch("https://example.com");
   expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
 });*/
});
