// test/index.spec.ts
import { env, ProvidedEnv, SELF } from 'cloudflare:test';
import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {Logger} from "tslog";
import {gql} from "@apollo/client";
import { Catalyst, DataChannel } from '@catalyst/schema_zod';

const logger = new Logger();


describe("gateway integration tests", () => {
    const getToken = async (entity: string, claims?: string[], ctx?: any) => {
      const tokenResp = await env.AUTHX_TOKEN_API.signJWT({
        entity: entity,
        claims: claims
      })

      console.log({
        // @ts-ignore
        test: ctx.task.name,
        signedTokenForTest: tokenResp.token
      });

      return tokenResp.token;

    };


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
    await setup(env)
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
    await teardown(env)
  });

  it("should get data-channel for airplanes only when accessSwitch is 1 - THIS IS A BAD TEST", async (testContext) => {
    await setup(env)
    await env.DATA_CHANNEL_REGISTRAR.update("default", {
      id: "airplanes1",
      name: "airplanes",
      endpoint: "http://localhost:4001/graphql",
      accessSwitch: false,
      description: "na",
      creatorOrganization: "Org1"
    })
    // checks that airplanes is disabled
    console.log(await env.DATA_CHANNEL_REGISTRAR.list("default"))
    expect((await env.DATA_CHANNEL_REGISTRAR.list("default")).length).toBe(2)
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
    expect(json.data["__type"].fields).toHaveLength(1);

    expect(json.data["__type"].fields[0]['name']).toBe('health');
    await teardown(env)
  });


});
