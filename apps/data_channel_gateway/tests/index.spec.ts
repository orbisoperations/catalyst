// test/index.spec.ts
import {env, SELF} from "cloudflare:test";
import {describe, it, expect, beforeAll} from "vitest";
import {Logger} from "tslog";

const logger = new Logger();

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

      logger.info({
        tokenRequestPayload: gqlPayload,
        // @ts-ignore
        test: ctx.task.name,
      })

      const response = await env.AUTHX_TOKEN_API.fetch('https://authx-token-api/graphql', {
        method: "POST",
        body: gqlPayload,
        headers: {
          'content-type': 'application/json'
        },
      });

        // Fail early
      if (response.status !== 200) {
        logger.info({
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



  it("shows the data in the database before other tests", async () => {
    const qResult = await env.APP_DB.prepare('SELECT name FROM sqlite_master WHERE type = "table";').run();

    const dataChannels = await env.APP_DB.prepare('SELECT * FROM DataChannel;').run();

    // @ts-ignore
    console.log({dataChannels: dataChannels.results});
    // @ts-ignore
    console.log({qResult: qResult.results});
  });


  it("returns gf'd for a invalid token", async () => {
    const badToken = 'fake-and-insecure';

    const headers = new Headers();
    headers.set('Authorization', `Bearer ${badToken}`)


    const response = await SELF.fetch('https://data-channel-gateway/graphql', {
      method: 'GET',
      headers
    });
    const expected = {message: "Token validation failed"};
    expect(JSON.parse(await response.text())).toStrictEqual(expected);
  });

  it("returns GF'd for no auth header", async () => {
    const response = await SELF.fetch('https://data-channel-gateway/graphql', {
      method: 'GET',
    });

    expect(await response.text()).toMatchInlineSnapshot(`"{"error":"No Credenetials Supplied"}"`);
  });


  it("should return health a known good token no claims", async (textCtx) => {
    const token = await getToken("test", [], textCtx);
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

  it("should get datachannel for airplanes", async (testContext) => {


    const token = await getToken("Org1", ["airplanes"], testContext);
    const getAvailableQueries = await SELF.fetch('https://data-channel-gateway/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        // Query that resolves the available queries of the schema
        query: `{
            __type(name: "Query") {
                name
                fields {
                  name
                }
              }
          }`
      })
    });
      const getAvailableQueriesResponsePayload = await getAvailableQueries.text();

      console.log({text: getAvailableQueriesResponsePayload});

      const json = JSON.parse(getAvailableQueriesResponsePayload);

      console.log({json})

    // Since we did not provide claims when the token was created, this will only return the health query in the list of fields
    expect(json.data["__type"].fields).toHaveLength(3);
    // @ts-ignore
    // expect(responsePayload.data["__type"].fields[0]['name']).toBe('health');
  });
});