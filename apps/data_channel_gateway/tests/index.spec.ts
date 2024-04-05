// test/index.spec.ts
import {env, SELF} from "cloudflare:test";
import {describe, it, expect} from "vitest";


describe("gateway jwt validation", () => {
  const getToken = async (claims: any) => {
    const tokenQuery = `
      mutation {
        sign(entity: "test-entity", claims: [])
      }
    `

    const response = await env.AUTHX_TOKEN_API.fetch('https://authx-token-api/graphql', {
      method: "POST",
      body: JSON.stringify({
        query: tokenQuery
      }),
      headers: {
        'content-type': 'application/json'
      },
    })

    const {data} = await response.json() as {
      data: { sign: string }
    };

    return data.sign;
  };

  it("returns gf'd for a invalid token", async () => {
    const badToken = 'fake-and-insecure';

    const headers = new Headers();
    headers.set('Authorization', `Bearer ${badToken}`)


    const response = await SELF.fetch('https://data-channel-gateway/graphql', {
      method: 'GET',
      headers
    });

    expect(await response.text()).toMatchInlineSnapshot('"Token validation failed"');
  });

  it("returns GF'd for no auth header", async () => {
    const response = await SELF.fetch('https://data-channel-gateway/graphql', {
      method: 'GET',
    });

    expect(await response.text()).toMatchInlineSnapshot(`"{"error":"No Credenetials Supplied"}"`);
  });


  it("works with a known good token no claims", async () => {
    const token = await getToken([]);
    const response = await SELF.fetch('https://data-channel-gateway/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        'Accepts': 'application/json'
      },
      body: JSON.stringify({
        query: `{
            __type(name: "Query") {
                name
                fields {
                  name
                  type {
                    name
                    kind
                    ofType {
                      name
                      kind
                    }
                  }
                }
              }
          }`
      })
    });

    const responsePayload = await response.json<{
      data: {
        __type: {
          name: string;
          fields: unknown[]
        }}
    }>();

    // Since we did not provide claims when the token was created, this will only return the health query in the list of fields
    expect(responsePayload.data["__type"].fields).toHaveLength(1);
    // @ts-ignore
    expect(responsePayload.data["__type"].fields[0]['name']).toBe('health');
  });
});