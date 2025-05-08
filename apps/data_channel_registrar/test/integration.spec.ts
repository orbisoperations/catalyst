import { env, fetchMock, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DataChannel } from '../../../packages/schema_zod';
import { TEST_ORG_ID, validUsers } from './testUtils';

function generateDataChannels(count: number = 5): DataChannel[] {
  const dataChannels: DataChannel[] = [];
  for (let i = 0; i < count; i++) {
    const dataChannel = {
      id: `dummy-id-${i}`,
      name: `Data Channel ${i}`,
      endpoint: `https://example.com/data${i}`,
      creatorOrganization: TEST_ORG_ID,
      accessSwitch: true,
      description: `This is a test data channel ${i}`,
    };
    dataChannels.push(dataChannel);
  }
  return dataChannels;
}

async function custodianCreatesDataChannel(dataChannel: DataChannel) {
  expect(dataChannel).toBeDefined();

  const user = validUsers['cf-custodian-token'];
  expect(user).toBeDefined();

  // add the data custodian to the org
  const addDataCustodianToOrg = await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, user.email);
  expect(addDataCustodianToOrg).toBeDefined();

  const createResponse = await SELF.create('default1', dataChannel, {
    cfToken: 'cf-custodian-token',
  });
  expect(createResponse).toBeDefined();
  expect(createResponse.success).toBe(true);

  // add the data channel to the org
  const addDataChannelToOrg = await env.AUTHZED.addDataChannelToOrg(TEST_ORG_ID, dataChannel.id);
  expect(addDataChannelToOrg).toBeDefined();

  // add the org to the data channel
  const addOrgToDataChannel = await env.AUTHZED.addOrgToDataChannel(dataChannel.id, TEST_ORG_ID);
  expect(addOrgToDataChannel).toBeDefined();

  return createResponse.success
    ? createResponse.data
      ? Array.isArray(createResponse.data)
        ? createResponse.data[0]
        : createResponse.data
      : null
    : null;
}

// Need better mocking of the clouflare acess service on the vitest.config.ts
// Need to mock the authzed service
describe('Data Channel Registrar as Durable Object integration tests', () => {
  beforeEach(async () => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(async () => {
    fetchMock.deactivate();
    fetchMock.assertNoPendingInterceptors();
  });

  describe('org admin user - access channels', () => {
    afterEach(async () => {
      // assert no data channels are in the DO
      const listDataChannels = await SELF.list('default1', {
        cfToken: 'cf-org-admin-token',
      });
      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      expect(listDataChannels.data).toBeDefined();
      expect(listDataChannels.data.length).toBe(0);
    });

    it('should be able to list data channels', async () => {
      // 1. setup step 1: create a data channel
      const dataChannel = generateDataChannels()[0];
      await custodianCreatesDataChannel(dataChannel); // only custodian can create a data channel
      await custodianCreatesDataChannel(dataChannel); // only custodian can create a data channel

      const adminToken = 'cf-org-admin-token';
      const user = validUsers[adminToken];
      const addAdminToOrg = await env.AUTHZED.addAdminToOrg(TEST_ORG_ID, user.email);
      expect(addAdminToOrg).toBeDefined();

      const listDataChannels = await SELF.list('default1', {
        cfToken: adminToken,
      });

      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      expect(listDataChannels.data).toBeDefined();
      expect(listDataChannels.data.length).toBe(2);
    });

    it('should not be able to create a data channel', async () => {
      const adminToken = 'cf-org-admin-token';
      const createdDataChannel = generateDataChannels()[0];

      const createResponse = await SELF.create('default1', createdDataChannel, {
        cfToken: adminToken,
      });
      expect(createResponse.success).toBe(false);
      expect(createResponse.data).toBeUndefined();

      // assert no channel was created
      const listDataChannels = await SELF.list('default1', {
        cfToken: adminToken,
      });
      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      expect(listDataChannels.data).toBeDefined();
      expect(listDataChannels.data.length).toBe(0);
    });

    it('should not be able to update a data channel', async () => {
      const adminToken = 'cf-org-admin-token';
      const createdDataChannel = generateDataChannels()[0];

      // create the channel
      const createResponse = await custodianCreatesDataChannel(createdDataChannel);

      createResponse.name = 'updated name';
      createResponse.description = 'updated description';

      // update the channel
      const updateResponse = await SELF.update('default1', createResponse, {
        cfToken: adminToken,
      });
      expect(updateResponse.success).toBe(false);
      expect(updateResponse.error).toBeDefined();

      // assert the channel was not updated
      const readResponse = await SELF.read('default1', createResponse.id, {
        cfToken: adminToken,
      });
      expect(readResponse.success).toBe(true);
      expect(readResponse.data).toBeDefined();
      expect(readResponse.data.name).toBe(createdDataChannel.name);
      expect(readResponse.data.description).toBe(createdDataChannel.description);
    });

    it('should not be able to delete a data channel', async () => {
      const adminToken = 'cf-org-admin-token';
      const createdDataChannel = generateDataChannels()[0];
      const createResponse = await custodianCreatesDataChannel(createdDataChannel);

      const deleteResponse = await SELF.remove('default1', createResponse?.id, {
        cfToken: adminToken,
      });
      expect(deleteResponse.success).toBe(false);
      expect(deleteResponse.error).toBeDefined();
    });

    it('should be able to read data channel by id', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();

      // assert exists 1 data channel in the DO
      const listDataChannels = await SELF.list('default1', {
        cfToken: 'cf-org-admin-token',
      });

      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      expect(listDataChannels?.data).toBeDefined();
      expect(listDataChannels?.data).toHaveLength(1);

      const adminToken = 'cf-org-admin-token';
      const user = validUsers[adminToken];

      // add permissions to the admin-user
      const addAdminToOrg = await env.AUTHZED.addAdminToOrg(TEST_ORG_ID, user.email);
      expect(addAdminToOrg).toBeDefined();
      const canReadDataChannel = await env.AUTHZED.canReadFromDataChannel(
        createdDataChannel?.id,
        user.email,
      );
      expect(canReadDataChannel).toBe(true);

      const findDataChannel = await SELF.read('default1', createdDataChannel?.id, {
        cfToken: adminToken, // valid token for ADMIN user, see vitest.config.ts
      });
      expect(findDataChannel.success).toBe(true);
      expect(findDataChannel).toBeDefined();
    });
  });

  describe('data custodian -  access channels', () => {
    it('should create a Data Channel and return the id, also show in the DO list', async () => {
      // same user as the one in the testUtils.ts
      const user = validUsers['cf-custodian-token'];

      // need to create a data custodian Role for the user
      const addDataCustodianToOrg = await env.AUTHZED.addDataCustodianToOrg(
        TEST_ORG_ID,
        user.email,
      );
      expect(addDataCustodianToOrg).toBeDefined();
      // NOTE: the id that is stored for the user in SpiceDB is the b64 encoded email
      expect(addDataCustodianToOrg.entity).toBe(
        `orbisops_catalyst_dev/organization:${TEST_ORG_ID}#data_custodian@orbisops_catalyst_dev/user:${btoa(user.email)}`,
      );

      const createResponse = await SELF.create('default1', generateDataChannels(1)[0], {
        cfToken: 'cf-custodian-token',
      });

      expect(createResponse).toBeDefined();
      expect(createResponse.success).toBe(true);
      if (createResponse.success == true) {
        const data = createResponse.data;
        expect(data).toBeDefined();
        const { data: parsedData } = DataChannel.safeParse(data);
        expect(parsedData).toBeDefined();
        expect(parsedData?.id).toBeDefined();
        expect(parsedData?.name).toBe('Data Channel 0');
        expect(parsedData?.endpoint).toBe('https://example.com/data0');
        expect(parsedData?.creatorOrganization).toBe(TEST_ORG_ID);
      }
    });

    it('should be able to create and list data channels', async () => {
      const channelsToCreate = generateDataChannels(2);

      for (const channel of channelsToCreate) {
        // here testing the custodian can create a data channel as well
        const response = await custodianCreatesDataChannel(channel);
        expect(response).toBeDefined();
        channel.id = response.id;
      }

      const listResponse = await SELF.list('default1', {
        cfToken: 'cf-custodian-token',
      });
      expect(listResponse).toBeDefined();
      expect(listResponse?.success).toBe(true);
      expect(listResponse?.data).toBeDefined();
      expect(listResponse?.data).toHaveLength(channelsToCreate.length);
    });

    it('should be able to create a Data Channel', async () => {
      // same user as the one in the vitest.config.ts | this simulates a valid CF user
      // dont create a data custodian Role for the user
      // Is supposed to fail on read permission check
      const custodianToken = 'cf-custodian-token';

      using createResponse = await SELF.create('default1', generateDataChannels(1)[0], {
        cfToken: custodianToken,
      });

      expect(createResponse.success).toBe(true);
      expect(createResponse.data).toBeDefined();
      expect(createResponse.data.id).toBeDefined();
      expect(createResponse.data.name).toBe('Data Channel 0');
      expect(createResponse.data.endpoint).toBe('https://example.com/data0');
      expect(createResponse.data.creatorOrganization).toBe(TEST_ORG_ID);
    });

    it('should be able to read data channel by id', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();

      const readResponse = await SELF.read('default1', createdDataChannel?.id, {
        cfToken: 'cf-custodian-token',
      });
      expect(readResponse.success).toBe(true);
      expect(readResponse.data).toBeDefined();
      expect(readResponse.data.id).toBe(createdDataChannel?.id);
    });

    it('should be able to delete a data channel', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();

      const deleteResponse = await SELF.remove('default1', createdDataChannel?.id, {
        cfToken: 'cf-custodian-token',
      });
      expect(deleteResponse.success).toBe(true);
    });
  });
});
