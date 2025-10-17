import { DataChannel } from '@catalyst/schemas';
import { env, SELF } from 'cloudflare:test';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_ORG_ID, validUsers } from '../utils/authUtils';
import {
  clearAllAuthzedRoles,
  custodianCreatesDataChannel,
  generateDataChannels,
} from '../utils/testUtils';

// Type the AUTHZED service properly
const AUTHZED = env.AUTHZED as {
  addAdminToOrg: (orgId: string, email: string) => Promise<{ entity: string } | undefined>;
  addDataCustodianToOrg: (orgId: string, email: string) => Promise<{ entity: string } | undefined>;
  addUserToOrg: (orgId: string, email: string) => Promise<{ entity: string } | undefined>;
  deleteUserFromOrg: (orgId: string, email: string) => Promise<unknown>;
  canReadFromDataChannel: (channelId: string | undefined, email: string) => Promise<boolean>;
};

// Need better mocking of the clouflare acess service on the vitest.config.ts
// Need to mock the authzed service
describe('Data Channel Registrar as Durable Object integration tests', () => {
  beforeAll(async () => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await clearAllAuthzedRoles();
  });

  describe('org admin user - access channels', () => {
    const orgAdminToken = 'cf-org-admin-token';

    beforeAll(async () => {
      const user = validUsers[orgAdminToken];
      const addAdminToOrg = await AUTHZED.addAdminToOrg(TEST_ORG_ID, user.email);
      expect(addAdminToOrg).toBeDefined();
      expect(addAdminToOrg.entity).toEqual(
        `orbisops_catalyst_dev/organization:${TEST_ORG_ID}#admin@orbisops_catalyst_dev/user:${btoa(user.email)}`,
      );
    });

    afterEach(async () => {
      // assert no data channels are in the DO
      const listDataChannels = await SELF.list('default', {
        cfToken: orgAdminToken,
      });
      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      if (listDataChannels.success) {
        const arr = Array.isArray(listDataChannels.data)
          ? listDataChannels.data
          : [listDataChannels.data];
        expect(arr.length).toBe(0);
      }
    });

    it('can list data channels', async () => {
      // 1. setup step 1: create a data channel
      const dataChannel = generateDataChannels()[0];
      await custodianCreatesDataChannel(dataChannel); // only custodian can create a data channel
      await custodianCreatesDataChannel(dataChannel); // only custodian can create a data channel

      const listDataChannels = await SELF.list('default', {
        cfToken: orgAdminToken,
      });

      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      if (listDataChannels.success) {
        const arr = Array.isArray(listDataChannels.data)
          ? listDataChannels.data
          : [listDataChannels.data];
        expect(arr.length).toBe(2);
      }
    });

    it('cannot create a data channel', async () => {
      const adminToken = 'cf-org-admin-token';
      const createdDataChannel = generateDataChannels()[0];

      const createResponse = await SELF.create('default', createdDataChannel, {
        cfToken: adminToken,
      });
      expect(createResponse.success).toBe(false);
      if (!createResponse.success) {
        expect('data' in createResponse).toBe(false);
      }

      // assert no channel was created
      const listDataChannels = await SELF.list('default', {
        cfToken: adminToken,
      });
      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      if (listDataChannels.success) {
        const arr = Array.isArray(listDataChannels.data)
          ? listDataChannels.data
          : [listDataChannels.data];
        expect(arr.length).toBe(0);
      }
    });

    it('cannot update a data channel', async () => {
      const adminToken = 'cf-org-admin-token';
      const createdDataChannel = generateDataChannels()[0];

      // create the channel
      const createResponse = await custodianCreatesDataChannel(createdDataChannel);

      createResponse.name = 'updated name';
      createResponse.description = 'updated description';

      // update the channel
      const updateResponse = await SELF.update('default', createResponse, {
        cfToken: adminToken,
      });
      expect(updateResponse.success).toBe(false);
      if (!updateResponse.success) {
        expect(updateResponse.error).toBeDefined();
      }

      // assert the channel was not updated
      const readResponse = await SELF.read('default', createResponse.id, {
        cfToken: adminToken,
      });
      expect(readResponse.success).toBe(true);
      if (readResponse.success) {
        const rd = Array.isArray(readResponse.data) ? readResponse.data[0] : readResponse.data;
        expect(rd.name).toBe(createdDataChannel.name);
        expect(rd.description).toBe(createdDataChannel.description);
      }
    });

    it('cannot delete a data channel', async () => {
      const adminToken = 'cf-org-admin-token';
      const createdDataChannel = generateDataChannels()[0];
      const createResponse = await custodianCreatesDataChannel(createdDataChannel);

      const deleteResponse = await SELF.remove('default', createResponse?.id, {
        cfToken: adminToken,
      });
      expect(deleteResponse.success).toBe(false);
      if (!deleteResponse.success) {
        expect(deleteResponse.error).toBeDefined();
      }
    });

    it('can read data channel by id', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();

      // assert exists 1 data channel in the DO
      const listDataChannels = await SELF.list('default', {
        cfToken: 'cf-org-admin-token',
      });

      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      if (listDataChannels.success) {
        const arr = Array.isArray(listDataChannels.data)
          ? listDataChannels.data
          : [listDataChannels.data];
        expect(arr).toHaveLength(1);
      }

      const adminToken = 'cf-org-admin-token';
      const user = validUsers[adminToken];

      // add permissions to the admin-user
      const addAdminToOrg = await AUTHZED.addAdminToOrg(TEST_ORG_ID, user.email);
      expect(addAdminToOrg).toBeDefined();
      const canReadDataChannel = await AUTHZED.canReadFromDataChannel(
        createdDataChannel?.id,
        user.email,
      );
      expect(canReadDataChannel).toBe(true);

      const findDataChannel = await SELF.read('default', createdDataChannel?.id, {
        cfToken: adminToken, // valid token for ADMIN user, see vitest.config.ts
      });
      expect(findDataChannel.success).toBe(true);
      expect(findDataChannel).toBeDefined();
    });
  });

  describe('data custodian -  access channels', () => {
    /**
     * add the custodian to the org before the tests
     */
    beforeAll(async () => {
      const user = validUsers['cf-custodian-token'];
      const addDataCustodianToOrg = await AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, user.email);
      expect(addDataCustodianToOrg).toBeDefined();
      expect(addDataCustodianToOrg.entity).toEqual(
        `orbisops_catalyst_dev/organization:${TEST_ORG_ID}#data_custodian@orbisops_catalyst_dev/user:${btoa(user.email)}`,
      );
    });
    /**
     * Assert that there are no data channels before the tests
     */
    beforeEach(async () => {
      const listDataChannels = await SELF.list('default', {
        cfToken: 'cf-custodian-token',
      });
      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      if (listDataChannels.success) {
        const arr = Array.isArray(listDataChannels.data)
          ? listDataChannels.data
          : [listDataChannels.data];
        expect(arr.length).toBe(0);
      }
    });
    it('can CREATE a Data Channel', async () => {
      const createResponse = await SELF.create('default', generateDataChannels(1)[0], {
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

    it('can LIST data channels', async () => {
      const channelsToCreate = generateDataChannels(2);
      for (const channel of channelsToCreate) {
        // here testing the custodian can create a data channel as well
        const response = await custodianCreatesDataChannel(channel);
        expect(response).toBeDefined();
        channel.id = response.id;
      }
      const listResponse = await SELF.list('default', {
        cfToken: 'cf-custodian-token',
      });
      expect(listResponse.success).toBe(true);
      expect(listResponse).toBeDefined();
      if (listResponse.success) {
        const arr = Array.isArray(listResponse.data) ? listResponse.data : [listResponse.data];
        expect(arr).toHaveLength(channelsToCreate.length);
      }
    });

    it('can UPDATE a Data Channel', async () => {
      // same user as the one in the vitest.config.ts | this simulates a valid CF user
      // dont create a data custodian Role for the user
      // Is supposed to fail on read permission check
      const custodianToken = 'cf-custodian-token';

      using createResponse = await SELF.create('default', generateDataChannels(1)[0], {
        cfToken: custodianToken,
      });

      expect(createResponse.success).toBe(true);
      if (!createResponse.success) {
        throw new Error('Failed to create data channel');
      }

      const createdDataChannel = Array.isArray(createResponse.data)
        ? createResponse.data[0]
        : createResponse.data;

      createdDataChannel.name = 'Updated Data Channel';
      createdDataChannel.endpoint = 'https://example.com/updated-data';
      createdDataChannel.description = 'Updated Description';

      const updateResponse = await SELF.update('default', createdDataChannel, {
        cfToken: custodianToken,
      });
      expect(updateResponse.success).toBe(true);
      if (!updateResponse.success) {
        throw new Error('Failed to update data channel');
      }
      const updatedDataChannel = Array.isArray(updateResponse.data)
        ? updateResponse.data[0]
        : updateResponse.data;

      expect(updatedDataChannel).toBeDefined();
      expect(updatedDataChannel.id).toBe(createdDataChannel.id);
      expect(updatedDataChannel.name).toBe('Updated Data Channel');
      expect(updatedDataChannel.endpoint).toBe('https://example.com/updated-data');
      expect(updatedDataChannel.description).toBe('Updated Description');
      expect(updatedDataChannel.creatorOrganization).toBe(TEST_ORG_ID);
    });

    it('can READ a data channel by id', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();

      const readResponse = await SELF.read('default', createdDataChannel?.id, {
        cfToken: 'cf-custodian-token',
      });
      expect(readResponse.success).toBe(true);
      if (!readResponse.success) {
        throw new Error('Failed to read data channel');
      }
      const readDataChannel = Array.isArray(readResponse.data)
        ? readResponse.data[0]
        : readResponse.data;
      expect(readDataChannel).toBeDefined();
      expect(readDataChannel.id).toBe(createdDataChannel?.id);
    });

    it('can DELETE a data channel', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();
      const deleteResponse = await SELF.remove('default', createdDataChannel?.id, {
        cfToken: 'cf-custodian-token',
      });
      expect(deleteResponse.success).toBe(true);
      // assert the data channel was deleted
      const listResponse = await SELF.list('default', {
        cfToken: 'cf-custodian-token',
      });
      expect(listResponse.success).toBe(true);
      if (listResponse.success) {
        const arr = Array.isArray(listResponse.data) ? listResponse.data : [listResponse.data];
        expect(arr.length).toBe(0);
      }
    });
  });

  describe('org user - access channels', () => {
    const orgUserToken = 'cf-user-token';

    /**
     * make sure that the user is added to the org before the tests
     */
    beforeAll(async () => {
      const user = validUsers[orgUserToken];
      const addUserToOrg = await AUTHZED.addUserToOrg(TEST_ORG_ID, user.email);
      expect(addUserToOrg).toBeDefined();
      expect(addUserToOrg.entity).toEqual(
        `orbisops_catalyst_dev/organization:${TEST_ORG_ID}#user@orbisops_catalyst_dev/user:${btoa(user.email)}`,
      );
    });

    // delete the user from the org after the tests
    afterAll(async () => {
      const user = validUsers[orgUserToken];
      const removeUserFromOrg = await AUTHZED.deleteUserFromOrg(TEST_ORG_ID, user.email);

      expect(removeUserFromOrg).toBeDefined();
    });

    // assert that there exists no data channels before the tests
    beforeEach(async () => {
      const listDataChannels = await SELF.list('default', {
        cfToken: 'cf-custodian-token',
      });
      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      if (listDataChannels.success) {
        const arr = Array.isArray(listDataChannels.data)
          ? listDataChannels.data
          : [listDataChannels.data];
        expect(arr.length).toBe(0);
      }
    });

    it('cannot CREATE a data channel', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const orgUserToken = 'cf-user-token';
      const createResponse = await SELF.create('default', dataChannelToCreate, {
        cfToken: orgUserToken,
      });
      expect(createResponse.success).toBe(false);
      if (!createResponse.success) {
        expect(createResponse.error).toEqual(
          'catalyst asserts user does not have permission to create, update, or delete data channels',
        );
      }
    });
    it('can LIST data channels', async () => {
      const dataChannelToCreate = generateDataChannels(5);
      for (const channel of dataChannelToCreate) {
        const createdDataChannel = await custodianCreatesDataChannel(channel);
        expect(createdDataChannel).toBeDefined();
        expect(createdDataChannel?.id).toBeDefined();
      }

      const listResponse = await SELF.list('default', {
        cfToken: orgUserToken,
      });
      expect(listResponse.success).toBe(true);
      if (listResponse.success) {
        const arr = Array.isArray(listResponse.data) ? listResponse.data : [listResponse.data];
        expect(arr).toHaveLength(dataChannelToCreate.length);

        // convert from Data[] or Data => DataChannel[]
        let newList = Array.isArray(listResponse.data) ? listResponse.data : [listResponse.data];
        // sort by name
        newList = newList.sort((a, b) => a.name.localeCompare(b.name));
        newList.forEach((channel, idx) => {
          expect(channel.id).toBeDefined();
          expect(channel.name).toEqual(dataChannelToCreate[idx].name);
          expect(channel.endpoint).toEqual(dataChannelToCreate[idx].endpoint);
          expect(channel.description).toEqual(dataChannelToCreate[idx].description);
          expect(channel.accessSwitch).toEqual(dataChannelToCreate[idx].accessSwitch);
          expect(channel.creatorOrganization).toEqual(TEST_ORG_ID);
        });
      }
    });
    it('can READ a data channel', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();
      const readResponse = await SELF.read('default', createdDataChannel?.id, {
        cfToken: orgUserToken,
      });
      expect(readResponse.success).toBe(true);
      if (readResponse.success) {
        expect({ ...readResponse.data, id: undefined }).toStrictEqual({
          ...createdDataChannel,
          id: undefined,
        });
      }
    });
    it('cannot DELETE a data channel', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();

      // Assert that the data channels exists
      // list the data channels
      // Needed to confirm that the user cant delete the data channel
      const listResponse = await SELF.list('default', {
        cfToken: 'cf-custodian-token',
      });

      expect(listResponse.success).toBe(true);
      if (listResponse.success) {
        const arr = Array.isArray(listResponse.data) ? listResponse.data : [listResponse.data];
        expect(arr.length).toBe(1);
      }
      ////////////////////////////////////////

      const deleteResponse = await SELF.remove('default', createdDataChannel?.id, {
        cfToken: orgUserToken,
      });
      expect(deleteResponse.success).toBe(false);
      if (!deleteResponse.success) {
        expect(deleteResponse.error).toEqual(
          'catalyst asserts user does not have permission to create, update, or delete data channels',
        );
      }
    });
    it('cannot UPDATE a data channel', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();

      // list the data channels
      // Needed to confirm that the user cant update the data channel
      const listResponse = await SELF.list('default', {
        cfToken: 'cf-custodian-token',
      });
      expect(listResponse).toBeDefined();
      expect(listResponse.success).toBe(true);
      if (listResponse.success) {
        const arr = Array.isArray(listResponse.data) ? listResponse.data : [listResponse.data];
        expect(arr.length).toBe(1);
      }
      //////////////////////////////////////

      const updateResponse = await SELF.update('default', createdDataChannel, {
        cfToken: orgUserToken,
      });
      // Assert that the user cant update the data channel
      expect(updateResponse.success).toBe(false);
      if (!updateResponse.success) {
        expect(updateResponse.error).toEqual(
          'catalyst asserts user does not have permission to create, update, or delete data channels',
        );
      }
    });
  });

  describe('platform admin token - access channels', () => {
    /**
     * Note for this test we are using the platform admin token
     * which is a valid token for the platform admin
     * and is supposed to have access to all the data channels
     * This role is not added to the org, but is added to the platform (Zitadel)
     */
    const platformAdminToken = 'cf-platform-admin-token';

    // assert that there exists no data channels before the tests
    beforeEach(async () => {
      const listDataChannels = await SELF.list('default', {
        cfToken: 'cf-custodian-token',
      });
      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      if (listDataChannels.success) {
        const arr = Array.isArray(listDataChannels.data)
          ? listDataChannels.data
          : [listDataChannels.data];
        expect(arr.length).toBe(0);
      }
    });

    it('cannot LIST data channels', async () => {
      const dataChannelToCreate = generateDataChannels(5);
      for (const channel of dataChannelToCreate) {
        const createdDataChannel = await custodianCreatesDataChannel(channel);
        expect(createdDataChannel).toBeDefined();
        expect(createdDataChannel?.id).toBeDefined();
      }
      const listResponse = await SELF.list('default', {
        cfToken: platformAdminToken,
      });
      expect(listResponse.success).toBe(true);
      if (listResponse.success) {
        const arr = Array.isArray(listResponse.data) ? listResponse.data : [listResponse.data];
        expect(arr).toEqual([]);
      }
    });
    it('cannot CREATE a data channel', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createResponse = await SELF.create('default', dataChannelToCreate, {
        cfToken: platformAdminToken,
      });
      expect(createResponse.success).toBe(false);
      if (!createResponse.success) {
        expect(createResponse.error).toEqual(
          'catalyst asserts user does not have permission to create, update, or delete data channels',
        );
      }
    });
    it('cannot READ a data channel', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();
      const readResponse = await SELF.read('default', createdDataChannel?.id, {
        cfToken: platformAdminToken,
      });
      expect(readResponse.success).toBe(false);
      if (!readResponse.success) {
        expect(readResponse.error).toEqual(
          'catalyst asserts user does not have permission to read data channel',
        );
      }
    });
    it('cannot DELETE a data channel', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();
      // List the data channels, validate that the data channel exists
      // Needed to confirm that the user cant delete the data channel
      const listResponse = await SELF.list('default', {
        cfToken: 'cf-custodian-token',
      });

      expect(listResponse.success).toBe(true);
      if (listResponse.success) {
        const arr = Array.isArray(listResponse.data) ? listResponse.data : [listResponse.data];
        expect(arr.length).toBe(1);
      }
      //////////////////////////////////////
      const deleteResponse = await SELF.remove('default', createdDataChannel?.id, {
        cfToken: platformAdminToken,
      });
      expect(deleteResponse.success).toBe(false);
      if (!deleteResponse.success) {
        expect(deleteResponse.error).toEqual(
          'catalyst asserts user does not have permission to create, update, or delete data channels',
        );
      }
    });
    it('cannot UPDATE a data channel', async () => {
      const dataChannelToCreate = generateDataChannels()[0];
      const createdDataChannel = await custodianCreatesDataChannel(dataChannelToCreate);
      expect(createdDataChannel).toBeDefined();
      expect(createdDataChannel?.id).toBeDefined();

      // list the data channels
      // Needed to confirm that the user cant update the data channel
      const listResponse = await SELF.list('default', {
        cfToken: 'cf-custodian-token',
      });

      expect(listResponse).toBeDefined();
      expect(listResponse.success).toBe(true);
      if (listResponse.success) {
        const arr = Array.isArray(listResponse.data) ? listResponse.data : [listResponse.data];
        expect(arr.length).toBe(1);
      }
      //////////////////////////////////////
      const updateResponse = await SELF.update('default', createdDataChannel, {
        cfToken: platformAdminToken,
      });
      expect(updateResponse.success).toBe(false);
      if (!updateResponse.success) {
        expect(updateResponse.error).toEqual(
          'catalyst asserts user does not have permission to create, update, or delete data channels',
        );
      }
    });
  });
});
