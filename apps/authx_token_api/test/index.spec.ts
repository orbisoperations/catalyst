// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
// @ts-ignore
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

// EXMAPLE
// describe("Hello World worker", () => {
//   it("responds with Hello World! (unit style)", async () => {
//     const request = new IncomingRequest("http://example.com");
//     // Create an empty context to pass to `worker.fetch()`.
//     const ctx = createExecutionContext();
//     const response = await worker.fetch(request, env, ctx);
//     // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
//     await waitOnExecutionContext(ctx);
//     expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
//   });
//
//   it("responds with Hello World! (integration style)", async () => {
//    const response = await SELF.fetch("https://example.com");
//    expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
//  });
// });

describe("authx service", () => {



  // it("validates a jwt", async () => {
  //   const request = new IncomingRequest("http://example.com");
  //   // Create an empty context to pass to `worker.fetch()`.
  //   const ctx = createExecutionContext();
  //   const response = await worker.fetch(request, env, ctx);
  //   // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
  //   await waitOnExecutionContext(ctx);
  //   expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
  // });
//
  it("validates a jwt", async () => {
	  // const client = new Client({
		//   url: `https://authx_api/graphql`,
		//   exchanges: [fetchExchange],
		//   preferGetMethod: "within-url-limit",
		//   fetch: SELF.fetch as any
	  // });
	  //
	  // const fakeToken = 'this-token-is-fake';

	  // const query = gql`
		//   query {
		// 	  test
		//   }
	  // `;

	  const response = await SELF.fetch('https://authx_token_api/graphql', {
		  	method: 'POST',
		  body: JSON.stringify({
			  query: {
				  test: ''
			  }
		  })
	  });

	  const resolved = await response.text();



	  // const response = await client.query(query, {}).toPromise();
	  // console.log(response);
	  expect(await response.text()).toMatchInlineSnapshot('ok');
 });
});
