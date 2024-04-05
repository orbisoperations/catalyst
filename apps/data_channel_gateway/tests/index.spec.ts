// test/index.spec.ts
import {env, SELF} from "cloudflare:test";
import {describe, it, expect} from "vitest";
import {createRequest, gql} from "@urql/core";


describe("gateway jwt validation", () => {
    const getToken = async (entity: string, claims?: string[], ctx?: any) => {
        const tokenQuery = `
            mutation GetTokenForTests($entity: String!, $claims: [String!]) {
                sign(entity: $entity, claims: $claims)
            }
        `;

      const gqlPayload = JSON.stringify({
        query: tokenQuery,
        variables: {
          entity: entity,
          claims: claims,
        },
      });

      console.log({
        tokenRequestPayload: gqlPayload,
        // @ts-ignore
        test: ctx.task.name,
      });

      const response = await env.AUTHX_TOKEN_API.fetch('https://authx-token-api/graphql', {
        method: "POST",
        body: gqlPayload,
        headers: {
          'content-type': 'application/json'
        },
      });

        // Fail early
      if (response.status !== 200) {
        console.log({
          test: ctx.task.name,
          // @ts-ignore
          tokenGenerationFailureResponse: response,
        });
        throw new Error('getToken in tests failed')
      }

        // Parse the response and return the token
      try {
        const responseRaw = await response.text();

        console.log({responseRaw});
        const json = JSON.parse(responseRaw);
        const {data} = json;
        const token = data.sign;
        console.log({
          // @ts-ignore
          test: ctx.task.name,
          signedTokenForTest: token
        });

        return token;
      } catch (e) {
        console.error(e)
      }
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


  it("should return health a known good token no claims", async () => {
    const token = await getToken("test");
    const response = await SELF.fetch('https://data-channel-gateway/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        'Accepts': 'application/json'
      },
      body: JSON.stringify({
        // Get the possible queries from the schema
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
        }
      }
    }>();

    // Since we did not provide claims when the token was created, this will only return the health query in the list of fields
    expect(responsePayload.data["__type"].fields).toHaveLength(1);
    // @ts-ignore
    expect(responsePayload.data["__type"].fields[0]['name']).toBe('health');
  });

  it("should correlate jwt claims with channels", async (testContext) => {


    const token = await getToken("test", ["airplanes"], testContext);
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
        }
      }
    }>();

    console.log(JSON.stringify(responsePayload.data))

    // Since we did not provide claims when the token was created, this will only return the health query in the list of fields
    expect(responsePayload.data["__type"].fields).toHaveLength(2);
    // @ts-ignore
    // expect(responsePayload.data["__type"].fields[0]['name']).toBe('health');
  });
});