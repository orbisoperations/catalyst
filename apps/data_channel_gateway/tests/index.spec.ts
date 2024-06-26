// test/index.spec.ts
import { env, ProvidedEnv, SELF } from 'cloudflare:test';
import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {Logger} from "tslog";
import {gql} from "@apollo/client";
import { Catalyst, DataChannel } from '@catalyst/schema_zod';

const logger = new Logger();

const setup = async (env: ProvidedEnv) => {
  console.log(env)
  const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName("default")
  const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id)

  await stub.update({
    id: 'airplanes1',
    name: 'airplanes',
    endpoint: 'http://localhost:4001/graphql',
    accessSwitch: true,
    description: 'na',
    creatorOrganization: 'Org1',
  });

  await stub.update({
    id: "cars1",
    name: "cars",
    endpoint: "http://localhost:4002/graphql",
    accessSwitch: true,
    description: "na",
    creatorOrganization: "Org1"
  })

  await stub.update({
    id: "man1",
    name: "manufacture",
    endpoint: "http://localhost:4003/graphql",
    accessSwitch: true,
    description: "na",
    creatorOrganization: "Org1"
  })

  console.log(await stub.list())
  expect((await stub.list())).toHaveLength(3)
}

const teardown = async (env: ProvidedEnv) => {
  console.log(env)
  const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName("default")
  const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id)
  await stub.delete("airplanes1")
  await stub.delete("cars1")
  await stub.delete("man1")
  console.log(await stub.list())
  expect((await stub.list())).toHaveLength(0)
}

describe("gateway integration tests", () => {
    const getToken = async (entity: string, claims: string[], ctx?: any) => {
      const jwtDOID = env.JWT_TOKEN_DO.idFromName('default');
      const jwtStub = env.JWT_TOKEN_DO.get(jwtDOID);
      const tokenResp = await jwtStub.signJWT({
        entity: entity,
        claims: claims
      }, 10 * 60 * 1000)

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
    console.error("responsePayload", responsePayload)
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
    const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName("default")
    const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id)
    await stub.update({
      id: "airplanes1",
      name: "airplanes",
      endpoint: "http://localhost:4001/graphql",
      accessSwitch: false,
      description: "na",
      creatorOrganization: "Org1"
    })

    const token = await getToken("Org1", ["airplanes"], testContext);

    // checks that airplanes is disabled
    const dataChannelList = await env.DATA_CHANNEL_REGISTRAR.list(
      "default",
      {
        catalystToken: token
      }
    );
    console.log(await stub.list())
    expect((await stub.list()).length).toBe(2)

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
