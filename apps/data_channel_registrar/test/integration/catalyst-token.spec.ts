import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllAuthzedRoles,
  custodianCreatesDataChannel,
  generateDataChannels,
  getCatalystToken,
  TEST_ORG_ID,
  validUsers,
} from '../utils/testUtils';
import { env, SELF } from 'cloudflare:test';

describe('Testing the catalyst token access controls to data channels', () => {
  it('must fail if no token is provided', async () => {
    const readResult = await SELF.read('default', 'dummy-data-channel-id', {});
    expect(readResult.success).toBe(false);
    if (!readResult.success) {
      expect(readResult.error).toBe('catalyst did not recieve a token');
    }

    const removeResult = await SELF.remove('default', 'dummy-data-channel-id', {});
    expect(removeResult.success).toBe(false);
    if (!removeResult.success) {
      expect(removeResult.error).toBe('catalyst did not recieve a user token');
    }
  });

  describe('entity in catalyst token has custodian role', () => {
    it('can READ a data channel', async () => {
      // create a data channel and add role to org
      const dataChannel = generateDataChannels()[0];
      const channelsToCreate = await custodianCreatesDataChannel(dataChannel);
      expect(channelsToCreate).toBeDefined();

      // create token with data channel id in claims
      const token = await getCatalystToken('cf-custodian-token', [channelsToCreate.id]);

      const result = await SELF.read('default', channelsToCreate.id, {
        catalystToken: token.token,
      });
      if (!result.success) {
        console.error('Read failed with error:', result.error);
      }
      expect(result.success).toBe(true);
      if (result.success) {
        const dataChannel = Array.isArray(result.data) ? result.data[0] : result.data;
        expect(dataChannel).toBeDefined();
        expect(dataChannel.name).toBe(channelsToCreate.name);
      }
    });
  });

  describe('entity in catalyst token is org admin', () => {
    beforeEach(async () => {
      await clearAllAuthzedRoles();
    });

    it('can READ a data channel', async () => {
      const dataChannel = generateDataChannels()[0];
      const channelsToCreate = await custodianCreatesDataChannel(dataChannel);
      expect(channelsToCreate).toBeDefined();

      // add org admin role to org
      const user = validUsers['cf-org-admin-token'];
      const addOrgAdminToOrg = await env.AUTHZED.addAdminToOrg(TEST_ORG_ID, user.email);
      expect(addOrgAdminToOrg).toBeDefined();

      // assert 1 data channel in the DO
      const listDataChannels = await SELF.list('default', {
        cfToken: 'cf-org-admin-token',
      });
      expect(listDataChannels).toBeDefined();
      expect(listDataChannels.success).toBe(true);
      if (listDataChannels.success) {
        expect(listDataChannels.data).toBeDefined();
        expect(listDataChannels.data).toHaveLength(1);
      }

      // create token with data channel id in claims
      const token = await getCatalystToken('cf-org-admin-token', [channelsToCreate.id]);

      const result = await SELF.read('default', channelsToCreate.id, {
        catalystToken: token.token,
      });

      if (!result.success) {
        console.error('Read failed with error:', result.error);
      }
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });

    it('cannot CREATE, UPDATE or DELETE data channel', async () => {
      const dataChannel = generateDataChannels()[0];
      const channelsToCreate = await custodianCreatesDataChannel(dataChannel);
      expect(channelsToCreate).toBeDefined();

      // create token with data channel id in claims
      const token = await getCatalystToken('cf-org-admin-token', [channelsToCreate.id]);
      // add org admin role to org
      const user = validUsers['cf-org-admin-token'];
      const addOrgAdminToOrg = await env.AUTHZED.addAdminToOrg(TEST_ORG_ID, user.email);
      expect(addOrgAdminToOrg).toBeDefined();

      const result = await SELF.create('default', dataChannel, {
        catalystToken: token.token,
      });
      expect(result.success).toBe(false);
      if (result.success) {
        expect(result.data).toBeDefined();
      }

      const resultUpdate = await SELF.update('default', dataChannel, {
        catalystToken: token.token,
      });
      expect(resultUpdate.success).toBe(false);
      if (!resultUpdate.success) {
        expect(resultUpdate.error).toBeDefined();
      }

      const resultDelete = await SELF.remove('default', channelsToCreate.id, {
        catalystToken: token.token,
      });
      expect(resultDelete.success).toBe(false);
      if (!resultDelete.success) {
        expect(resultDelete.error).toBeDefined();
      }
    });
  });

  describe("entity doesn't have any roles", () => {
    it('cannot READ a data channel', async () => {
      await clearAllAuthzedRoles();
      // create token with data channel id in claims
      const token = await getCatalystToken('cf-org-admin-token', ['dummy-data-channel-id']);

      const result = await SELF.read('default', 'dummy-data-channel-id', {
        catalystToken: token.token,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
