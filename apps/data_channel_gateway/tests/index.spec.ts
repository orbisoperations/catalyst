// test/index.spec.ts
import { env, ProvidedEnv, SELF } from 'cloudflare:test';
import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {Logger} from "tslog";
import {gql} from "@apollo/client";
import { DataChannel } from '@catalyst/schema_zod';

const logger = new Logger();

const setupRegistrar = async (env: ProvidedEnv) => {
  console.log(env)
  await env.DATA_CHANNEL_REGISTRAR.update('default', {
    id: 'airplanes1',
    name: 'airplanes',
    endpoint: 'http://localhost:4001/graphql',
    accessSwitch: true,
    description: 'na',
    creatorOrganization: 'Org1',
  });
  await env.DATA_CHANNEL_REGISTRAR.update("default", {
    id: "cars1",
    name: "cars",
    endpoint: "http://localhost:4002/graphql",
    accessSwitch: true,
    description: "na",
    creatorOrganization: "Org1"
  })
  await env.DATA_CHANNEL_REGISTRAR.update("default", {
    id: "man1",
    name: "manufacture",
    endpoint: "http://localhost:4003/graphql",
    accessSwitch: true,
    description: "na",
    creatorOrganization: "Org1"
  })
  console.log(await env.DATA_CHANNEL_REGISTRAR.list("default"))
  expect((await env.DATA_CHANNEL_REGISTRAR.list("default"))).toHaveLength(3)
}

const teardownRegistrar = async (env: ProvidedEnv) => {
  await env.DATA_CHANNEL_REGISTRAR.delete("default", "airplanes1")
  await env.DATA_CHANNEL_REGISTRAR.delete("default", "cars1")
  await env.DATA_CHANNEL_REGISTRAR.delete("default", "man1")
  console.log(await env.DATA_CHANNEL_REGISTRAR.list("default"))
  expect((await env.DATA_CHANNEL_REGISTRAR.list("default"))).toHaveLength(0)
}


describe("authzed integration tests", () => {
  it("get schema",  async () => {
    console.log(env)
    const schema = await env.AUTHX_AUTHZED_API.schema()
    expect(schema).toBeDefined()
    /*(schema.schemaText).toEqual(`definition orbisops_catalyst_dev/data_channel {
      \trelation organization: orbisops_catalyst_dev/organization
      \tpermission read = organization->data_channel_read
      }
      
      definition orbisops_catalyst_dev/organization {
      \trelation admin: orbisops_catalyst_dev/user
      \trelation data_custodian: orbisops_catalyst_dev/user
      \trelation user: orbisops_catalyst_dev/user
      \trelation partner_organization: orbisops_catalyst_dev/organization
      \trelation data_channel: orbisops_catalyst_dev/data_channel
      \tpermission member = admin + data_custodian + user
      \tpermission role_assign = admin
      \tpermission data_channel_create = data_custodian
      \tpermission data_channel_update = data_channel_create
      \tpermission data_channel_delete = data_channel_create
      \tpermission data_channel_read = admin + data_custodian + user + partner_organization->data_channel_read
      }
      
      // Exported from permissions system catalyst dev (orbisops_catalyst_dev) on Fri Apr 05 2024 10:16:05 GMT-0700 (Pacific Daylight Time)
      definition orbisops_catalyst_dev/user {}`)*/
  })

  describe("organization tests", () => {
    it("add user", () => {})
    it("add data custodian", () => {})
    it("add admin", () => {})
    it("read users, data custodians, and admins", () => {})

    it("check membership", () =>{})
    it("check add role", () => {})
    it("check CUD of data channel", () => {})
    it("check R of data channel", () => {})
    it("delete users, data custodians, and admins", () => {})
  })
})

// testing in module doesnt seem to work now but works fine through miniflare
describe("registrar integration tests", () => {
  it("create data channel", async () => {
    const newDC = {
      name: "testsvc",
      endpoint: "https://example.com/graphql",
      accessSwitch: true,
      description: "",
      creatorOrganization: ""
    }

    const savedDC = await env.DATA_CHANNEL_REGISTRAR.create("dotest", newDC)
    expect(savedDC.id).toBeDefined()
    expect(savedDC.name).toBe(newDC.name)
    expect(savedDC.endpoint).toBe(newDC.endpoint)
  })

  it("create/get/delete data channel", async () => {
    const emptyDC = await env.DATA_CHANNEL_REGISTRAR.get("dotest","nextval")
    expect(emptyDC).toBeUndefined()
    await env.DATA_CHANNEL_REGISTRAR.update("dotest", {
      id: "nextval",
      name: "nextval",
      endpoint: "testend",
      description: "desc",
      creatorOrganization: "org",
      accessSwitch: true
    })

    expect(await env.DATA_CHANNEL_REGISTRAR.get("dotest","nextval")).toBeDefined()

    await env.DATA_CHANNEL_REGISTRAR.delete("dotest", "nextval")
    expect(await env.DATA_CHANNEL_REGISTRAR.get("dotest","nextval")).toBeUndefined()
  })

  it("list data channels", async ()=> {
    const newDC = {
      name: "testsvc",
      endpoint: "https://example.com/graphql",
      accessSwitch: true,
      description: "",
      creatorOrganization: ""
    }

    const savedDC = await env.DATA_CHANNEL_REGISTRAR.create("dotest", newDC)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("dotest")).toHaveLength(1)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("dotest", [])).toHaveLength(0)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("dotest", ["testsvc"])).toHaveLength(1)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("dotest", ["testsvc-nope"])).toHaveLength(0)

    await setupRegistrar(env)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default")).toHaveLength(3)
    await teardownRegistrar(env)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default")).toHaveLength(0)
  })

  it("list filter data channels", async () => {
    await setupRegistrar(env)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default")).toHaveLength(3)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default", ["cars"])).toHaveLength(1)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default", ["cars", "airplanes"])).toHaveLength(2)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default", ["cars", "airplanes", "manufacture"])).toHaveLength(3)

    await env.DATA_CHANNEL_REGISTRAR.update("default", {
      id: "man1",
      name: "manufacture",
      endpoint: "http://localhost:4003/graphql",
      accessSwitch: false,
      description: "na",
      creatorOrganization: "Org1"
    })

    expect(await env.DATA_CHANNEL_REGISTRAR.list("default", ["cars"])).toHaveLength(1)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default", ["cars", "airplanes"])).toHaveLength(2)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default", ["cars", "airplanes", "manufacture"])).toHaveLength(2)

    await env.DATA_CHANNEL_REGISTRAR.update("default", {
      id: "cars1",
      name: "cars",
      endpoint: "http://localhost:4002/graphql",
      accessSwitch: false,
      description: "na",
      creatorOrganization: "Org1"
    })

    expect(await env.DATA_CHANNEL_REGISTRAR.list("default", ["cars"])).toHaveLength(0)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default", ["cars", "airplanes"])).toHaveLength(1)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default", ["cars", "airplanes", "manufacture"])).toHaveLength(1)
  })
})
describe("gateway integration tests", () => {
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

  /*it("shows the data in the database before other tests", async () => {
    const qResult = await env.APP_DB.prepare('SELECT name FROM sqlite_master WHERE type = "table";').run();

    const dataChannels = await env.APP_DB.prepare('SELECT * FROM DataChannel;').run();

    // @ts-ignore
    console.log({dataChannels: dataChannels.results});
    // @ts-ignore
    console.log({qResult: qResult.results});
  });*/


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
    await setupRegistrar(env)
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
    await teardownRegistrar(env)
  });

  it("should get data-channel for airplanes only when accessSwitch is 1", async (testContext) => {
    await setupRegistrar(env)
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
    // @ts-ignore
    // expect(responsePayload.data["__type"].fields[0]['name']).toBe('health');
    await teardownRegistrar(env)
  });


});