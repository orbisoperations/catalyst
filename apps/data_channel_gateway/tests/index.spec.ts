// test/index.spec.ts
import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
// @ts-ignore
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("gateway jwt validation", () => {

  it("returns gf'd for a invalid token", async () => {
    const badToken = 'fake-and-insecure';

    const headers = new Headers();
    headers.set('Authorization', `Bearer ${badToken}`)


    const response = await SELF.fetch('https://data-channel-gateway/graphql', {
      method: 'GET',
      headers
    });

    expect(await response.text()).toMatchInlineSnapshot(`"GF'd"`);
  });

  it("returns GF'd for no auth header", async () => {
    const response = await SELF.fetch('https://data-channel-gateway/graphql', {
      method: 'GET',
    });

    expect(await response.text()).toMatchInlineSnapshot(`"{"error":"No Credenetials Supplied"}"`);
  });


  it("works with a known good token", async () => {

    const getToken = async (claims: any) => {
      const tokenQuery = `
      mutation {
        sign(entity: "test-entity", claims: [])
      }
    `

      const response =  await  env.AUTHX_TOKEN_API.fetch('https://authx-token-api/graphql', {
        method: "POST",
        body: JSON.stringify({
          query: tokenQuery
        }),
        headers: {
          'content-type': 'application/json'
        },
      })

      const {data} =  await response.json() as {
        data: { sign: string }
      };

      return data.sign;
    };

    const token = await getToken([]);


    const response = await SELF.fetch('https://data-channel-gateway/graphql', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });

    expect(await response.text()).toMatchInlineSnapshot("");
  });
});