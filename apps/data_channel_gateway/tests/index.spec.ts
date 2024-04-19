// test/index.spec.ts
import { env, ProvidedEnv, SELF } from 'cloudflare:test';
import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {Logger} from "tslog";
import {gql} from "@apollo/client";
import { Catalyst, DataChannel } from '@catalyst/schema_zod';

const logger = new Logger();

const setup = async (env: ProvidedEnv) => {
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

const teardown = async (env: ProvidedEnv) => {
  await env.DATA_CHANNEL_REGISTRAR.delete("default", "airplanes1")
  await env.DATA_CHANNEL_REGISTRAR.delete("default", "cars1")
  await env.DATA_CHANNEL_REGISTRAR.delete("default", "man1")
  console.log(await env.DATA_CHANNEL_REGISTRAR.list("default"))
  expect((await env.DATA_CHANNEL_REGISTRAR.list("default"))).toHaveLength(0)
}

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

    await setup(env)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default")).toHaveLength(3)
    await teardown(env)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default")).toHaveLength(0)
  })

  it("list filter data channels", async () => {
    await setup(env)
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
    teardown(env)
  })
})

describe.sequential("authzed integration tests", () => {
  it.sequential("get schema",  async () => {
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

  describe.sequential("organization tests", () => {
    it.sequential("add user", async () => {
      const org = "Org1"
      const userStatement = await env.AUTHX_AUTHZED_API.addUserToOrg(org,"TestUser")
      console.log(userStatement)
      expect(userStatement.entity).toBe("orbisops_catalyst_dev/organization:Org1#user@orbisops_catalyst_dev/user:TestUser")
      expect(userStatement.writtenAt).toBeDefined()
      await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org,"TestUser")
    })
    it.sequential("add data custodian", async () => {
      const org = "Org2"
      const userStatement = await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(org,"TestUser")
      console.log(userStatement)
      expect(userStatement.entity).toBe("orbisops_catalyst_dev/organization:Org2#data_custodian@orbisops_catalyst_dev/user:TestUser")
      expect(userStatement.writtenAt).toBeDefined()
      await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org,"TestUser")
    })
    it.sequential("add admin", async () => {
      const org = "Org3"
      const userStatement = await env.AUTHX_AUTHZED_API.addAdminToOrg(org,"TestUser")
      console.log(userStatement)
      expect(userStatement.entity).toBe("orbisops_catalyst_dev/organization:Org3#admin@orbisops_catalyst_dev/user:TestUser")
      expect(userStatement.writtenAt).toBeDefined()
      await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org,"TestUser")
    })
    it.sequential("read users, data custodians, and admins", async () => {
      const org = "Org4"
      await env.AUTHX_AUTHZED_API.addUserToOrg(org,"TestUser")
      await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(org,"TestUser")
      await env.AUTHX_AUTHZED_API.addAdminToOrg(org,"TestUser")
      const users = await env.AUTHX_AUTHZED_API.listUsersInOrg(org,"TestUser")
      console.log(users)
      expect(users).toHaveLength(3)
      expect(users).toContainEqual({ object: org, relation: 'user', subject: 'TestUser' })
      expect(users).toContainEqual({ object: org, relation: 'data_custodian', subject: 'TestUser' })
      expect(users).toContainEqual({ object: org, relation: 'admin', subject: 'TestUser' })

      const data_custodians = await env.AUTHX_AUTHZED_API.listUsersInOrg(org,"TestUser", [Catalyst.RoleEnum.enum.data_custodian])
      expect(data_custodians).toHaveLength(1)

      const admins = await env.AUTHX_AUTHZED_API.listUsersInOrg(org,"TestUser", [Catalyst.RoleEnum.enum.admin])
      expect(admins).toHaveLength(1)

      const noUser = await env.AUTHX_AUTHZED_API.listUsersInOrg(org,"notauser", [Catalyst.RoleEnum.enum.admin])
      expect(noUser).toHaveLength(0)

      await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org,"TestUser")
      await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org,"TestUser")
      await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org,"TestUser")
    })
    it.sequential("check membership", async () =>{
      const org = "Org5"
      await env.AUTHX_AUTHZED_API.addUserToOrg(org,"TestUser")
      const permsCheck = await env.AUTHX_AUTHZED_API.addUserToOrg(org,"TestUser")
      console.log(permsCheck)
      expect(permsCheck).toBeTruthy()

      expect(await env.AUTHX_AUTHZED_API.isMemberOfOrg(org,"NotAUser")).toBeFalsy()
      await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org,"TestUser")
    })
    it.sequential("check add role", async () => {
      const org = "Org6"
      // add a normal user
      await env.AUTHX_AUTHZED_API.addUserToOrg(org,"User")
      // add a normal admin
      await env.AUTHX_AUTHZED_API.addAdminToOrg(org,"Admin")
      // add a data_custodian
      await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(org,"DataCustodian")

      expect(await env.AUTHX_AUTHZED_API.canAssignRolesInOrg(org,"User")).toBeFalsy()
      expect(await env.AUTHX_AUTHZED_API.canAssignRolesInOrg(org,"DataCustodian")).toBeFalsy()
      expect(await env.AUTHX_AUTHZED_API.canAssignRolesInOrg(org,"Admin")).toBeTruthy()

      await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org, "User")
      await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org, "DataCustodian")
      await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org, "Admin")
    })
    it.sequential("check CUD of data channel", async () => {
      const org = "Org7"
      // add a normal user
      await env.AUTHX_AUTHZED_API.addUserToOrg(org,"User")
      // add a normal admin
      await env.AUTHX_AUTHZED_API.addAdminToOrg(org,"Admin")
      // add a data_custodian
      await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(org,"DataCustodian")

      expect(await env.AUTHX_AUTHZED_API.canCreateUpdateDeleteDataChannel(org,"User")).toBeFalsy()
      expect(await env.AUTHX_AUTHZED_API.canCreateUpdateDeleteDataChannel(org,"DataCustodian")).toBeTruthy()
      expect(await env.AUTHX_AUTHZED_API.canCreateUpdateDeleteDataChannel(org,"Admin")).toBeFalsy()
      await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org, "User")
      await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org, "DataCustodian")
      await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org, "Admin")
    })
    it.sequential("check R of data channel", async () => {
      const org = "Org8"
      // add a normal user
      await env.AUTHX_AUTHZED_API.addUserToOrg(org,"User")
      // add a normal admin
      await env.AUTHX_AUTHZED_API.addUserToOrg(org,"Admin")
      // add a data_custodian
      await env.AUTHX_AUTHZED_API.addUserToOrg(org,"DataCustodian")

      expect(await env.AUTHX_AUTHZED_API.canReadDataChannel(org,"User")).toBeTruthy()
      expect(await env.AUTHX_AUTHZED_API.canReadDataChannel(org,"DataCustodian")).toBeTruthy()
      expect(await env.AUTHX_AUTHZED_API.canReadDataChannel(org,"Admin")).toBeTruthy()
      await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org, "User")
      await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org, "DataCustodian")
      await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org, "Admin")
    })
    it.sequential("delete users, data custodians, and admins", async () => {
      const org = "Org9"
      // add a normal user
      await env.AUTHX_AUTHZED_API.addUserToOrg(org,"User")
      // add a normal admin
      await env.AUTHX_AUTHZED_API.addAdminToOrg(org,"Admin")
      // add a data_custodian
      await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(org,"DataCustodian")
      expect(await env.AUTHX_AUTHZED_API.listUsersInOrg(org)).toHaveLength(3)

      const deleteUser = await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org,"User")
      expect(deleteUser).toBeTruthy()

      const listUserDelete = await env.AUTHX_AUTHZED_API.listUsersInOrg(org)
      console.log(listUserDelete)
      expect(listUserDelete).toHaveLength(2)
      expect(listUserDelete).not.toContain({ object: org, relation: 'user', subject: 'User' })

      await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org,"DataCustodian")
      console.log(await env.AUTHX_AUTHZED_API.listUsersInOrg(org))
      expect(await env.AUTHX_AUTHZED_API.listUsersInOrg(org)).toHaveLength(1)

      await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org,"Admin")
      console.log(await env.AUTHX_AUTHZED_API.listUsersInOrg(org))
      expect(await env.AUTHX_AUTHZED_API.listUsersInOrg(org)).toHaveLength(0)
    })
    it.sequential("add, list, and delete data channels", async () => {
      const resp = await env.AUTHX_AUTHZED_API.addDataChannelToOrg("Org1", "DC1")
      expect(resp).toBeDefined()
      expect(resp.writtenAt!.token).toBeDefined()
      console.log(resp)

      const list = await env.AUTHX_AUTHZED_API.listDataChannelsInOrg("Org1")
      expect(list).toBeDefined()
      console.log(list)
      expect(list).toHaveLength(1)

      const deleteResp = await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg("Org1", "DC1")
      expect(deleteResp).toBeDefined()

      console.log(await env.AUTHX_AUTHZED_API.listDataChannelsInOrg("Org1"))
      expect(await env.AUTHX_AUTHZED_API.listDataChannelsInOrg("Org1")).toHaveLength(0)
    })
    it.sequential("add, list, and delete partners", async () => {
      const resp = await env.AUTHX_AUTHZED_API.addPartnerToOrg("Org1", "Org2")
      console.log(resp)
      expect(resp).toBeDefined()
      expect(resp.writtenAt!.token).toBeDefined()

      expect(await env.AUTHX_AUTHZED_API.listPartnersInOrg("Org1")).toHaveLength(1)

      const deleteResp = await env.AUTHX_AUTHZED_API.deletePartnerInOrg("Org1", "Org2")
      expect(deleteResp).toBeDefined()

      expect(await env.AUTHX_AUTHZED_API.listPartnersInOrg("Org1")).toHaveLength(0)
    })
  })
  describe.sequential("data channel tests", () => {
    it.sequential("add organization", async () => {
      const resp = await env.AUTHX_AUTHZED_API.addOrgToDataChannel("DC1", "Org1")
      console.log(resp)
      expect(resp).toBeDefined()

      expect(await env.AUTHX_AUTHZED_API.listOrgsInDataChannel("DC1")).toHaveLength(1)

      const deleteResp = await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel("DC1", "Org1")
      expect(deleteResp).toBeDefined()

      expect(await env.AUTHX_AUTHZED_API.listOrgsInDataChannel("DC1")).toHaveLength(0)
    })
    it.sequential("check user in parent org can read", async () => {
      await env.AUTHX_AUTHZED_API.addOrgToDataChannel("DC1", "Org1")
      await env.AUTHX_AUTHZED_API.addUserToOrg("Org1", "User1")
      expect(await env.AUTHX_AUTHZED_API.listOrgsInDataChannel("DC1")).toHaveLength(1)
      expect(await env.AUTHX_AUTHZED_API.listUsersInOrg("Org1","User1")).toHaveLength(1)

      const perms = await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC1", "User1")
      expect(perms).toBeDefined()
      expect(perms).toBeTruthy()

      await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel("DC1", "Org1")
      await env.AUTHX_AUTHZED_API.deleteUserFromOrg("Org1", "User1")
      expect(await env.AUTHX_AUTHZED_API.listOrgsInDataChannel("DC1")).toHaveLength(0)
      expect(await env.AUTHX_AUTHZED_API.listUsersInOrg("Org1", "User1"))
    })
  })

  const authzedSetup = async (env: ProvidedEnv) => {
    await env.AUTHX_AUTHZED_API.addOrgToDataChannel("DC1", "Org1")
    await env.AUTHX_AUTHZED_API.addOrgToDataChannel("DC2", "Org2")
    await env.AUTHX_AUTHZED_API.addUserToOrg("Org1", "User1")
    await env.AUTHX_AUTHZED_API.addUserToOrg("Org2", "User2")
  }

  const authzedTeardown = async (env: ProvidedEnv) => {
    await env.AUTHX_AUTHZED_API.addOrgToDataChannel("DC1", "Org1")
    await env.AUTHX_AUTHZED_API.addOrgToDataChannel("DC2", "Org2")
    await env.AUTHX_AUTHZED_API.addUserToOrg("Org1", "User1")
    await env.AUTHX_AUTHZED_API.addUserToOrg("Org2", "User2")
  }
  describe.sequential("multi functional tests", () => {
    describe.sequential("share data channel between orgs", async () => {
      it.sequential("orgs can read own data channels", async () => {
        await authzedSetup(env)
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC1", "User1")).toBeTruthy()
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC2", "User2")).toBeTruthy()
        await authzedTeardown(env)
      })
      it.sequential("cannot read other org data channel without share", async () => {
        await authzedSetup(env)
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC1", "User2")).toBeFalsy()
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC2", "User1")).toBeFalsy()
        await authzedTeardown(env)
      })
      it.sequential("org1 shares with org2", async () => {
        await authzedSetup(env)
        await env.AUTHX_AUTHZED_API.addPartnerToOrg("Org1", "Org2")
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC1", "User1")).toBeTruthy()
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC2", "User1")).toBeFalsy()
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC1", "User2")).toBeTruthy()
        expect(await env.AUTHX_AUTHZED_API.deletePartnerInOrg("Org1", "Org2")).toBeDefined()
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC1", "User2")).toBeFalsy()
        await authzedTeardown(env)
      })

      it.sequential("org 2 shares with org1", async () => {
        await authzedSetup(env)
        // this adds org1 as a partner to org2
        await env.AUTHX_AUTHZED_API.addPartnerToOrg("Org2", "Org1")
        // since user 2 is in org 2 it can read dc2
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC2", "User2")).toBeTruthy()
        // dc1 belongs to org1, so user2 cannot access because org1 is not a partner with org2
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC1", "User2")).toBeFalsy()
        // dc2 belongs to org2, so user1 can access dc2 because the chain of permissions go
        // dc1:read -> org2:parnter -> org1:datachannel_read -> user1
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC2", "User1")).toBeTruthy()

        expect(await env.AUTHX_AUTHZED_API.deletePartnerInOrg("Org2", "Org1")).toBeDefined()
        expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel("DC2", "User1")).toBeFalsy()
        await authzedTeardown(env)
      })
      // issue here with running after all it-tests
    })
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

    await setup(env)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default")).toHaveLength(3)
    await teardown(env)
    expect(await env.DATA_CHANNEL_REGISTRAR.list("default")).toHaveLength(0)
  })

  it("list filter data channels", async () => {
    await setup(env)
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

describe("jwt integration tests", () => {
  it("can get the public key", async () =>{
    const pkey = await env.AUTHX_TOKEN_API.getPublicKey()
    expect(pkey).toBeDefined()
    expect(pkey).toBeTypeOf("object")
    expect(pkey.pem).toBeTypeOf("string")
  })
  it("can rotate the key", async () => {
    const pkey1 = await env.AUTHX_TOKEN_API.getPublicKey()
    expect(pkey1).toBeDefined()
    expect(pkey1).toBeTypeOf("object")
    expect(pkey1.pem).toBeTypeOf("string")

    expect(await env.AUTHX_TOKEN_API.rotateKey()).toBeTruthy()
    const pkey2 = await env.AUTHX_TOKEN_API.getPublicKey()
    expect(pkey2).toBeDefined()
    expect(pkey2).toBeTypeOf("object")
    expect(pkey2.pem).toBeTypeOf("string")

    expect(pkey1.pem).not.toBe(pkey2.pem)
  })
  it("can sign and verify a jwt", async () => {
    const jwtRequest = {
      entity: "testuser",
      claims: ["testclaim"],
    }
    const tokenResp = await env.AUTHX_TOKEN_API.signJWT(jwtRequest)
    console.log(tokenResp)
    const validateResp = await env.AUTHX_TOKEN_API.validateToken(tokenResp.token)
    delete validateResp["Symbol(dispose)"]
    console.log(validateResp)
    expect(validateResp.claims[0]).toBe( 'testclaim' )
    expect(validateResp.valid).toBeTruthy()
    expect(validateResp.entity).toBe("testuser")

    const invalid = await env.AUTHX_TOKEN_API.validateToken(tokenResp.token + "makebad")
    expect(invalid.valid).toBeFalsy()
  })
})
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