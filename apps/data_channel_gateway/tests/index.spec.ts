// test/index.spec.ts
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
// @ts-ignore
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("data channel gateway", () => {
  it("validates a jwt", async () => {

    const query = `
      query {
        health
      }
    `;

    const response = await SELF.fetch('https://data-channel-gateway/health', {
      method: 'GET',
      // body: JSON.stringify({ query }),
    });

    expect(await response.text()).toMatchInlineSnapshot(`"ok"`);
  });
});
