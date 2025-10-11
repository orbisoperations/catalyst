import { DataChannel } from '@catalyst/schemas';
import { env, fetchMock, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TEST_ORG_ID, validUsers } from '../utils/authUtils';

describe('Channel Share Integration Tests', () => {
  // Test data
  const testOrg1 = TEST_ORG_ID;
  const testOrg2 = 'partner-org-1';
  const testOrg3 = 'partner-org-2';
  const custodianToken = 'cf-custodian-token';
  const userToken = 'cf-user-token';
  const custodianEmail = validUsers[custodianToken].email;
  const userEmail = validUsers[userToken].email;

  let testChannel1: DataChannel;
  let testChannel2: DataChannel;

  beforeEach(async () => {
    fetchMock.activate();
    fetchMock.disableNetConnect();

    // Setup: Add custodian to test org
    await env.AUTHZED.addDataCustodianToOrg(testOrg1, custodianEmail);
    await env.AUTHZED.addUserToOrg(testOrg1, userEmail);

    // Setup: Create test channels owned by testOrg1
    const doId = env.DO.idFromName('default');
    const stub = env.DO.get(doId);

    testChannel1 = await stub.create({
      name: 'Test Channel 1',
      endpoint: 'https://example.com/channel1',
      creatorOrganization: testOrg1,
      accessSwitch: true,
      description: 'Test channel for share tests',
    });

    testChannel2 = await stub.create({
      name: 'Test Channel 2',
      endpoint: 'https://example.com/channel2',
      creatorOrganization: testOrg1,
      accessSwitch: true,
      description: 'Second test channel',
    });

    // Setup AuthZed relationships for channels
    await env.AUTHZED.addDataChannelToOrg(testOrg1, testChannel1.id);
    await env.AUTHZED.addOrgToDataChannel(testChannel1.id, testOrg1);
    await env.AUTHZED.addDataChannelToOrg(testOrg1, testChannel2.id);
    await env.AUTHZED.addOrgToDataChannel(testChannel2.id, testOrg1);

    // Setup partnerships
    await env.AUTHZED.addPartnerToOrg(testOrg1, testOrg2);
    await env.AUTHZED.addPartnerToOrg(testOrg1, testOrg3);
  });

  afterEach(() => {
    fetchMock.deactivate();
    fetchMock.assertNoPendingInterceptors();
  });

  // ==================================================================================
  // shareChannelWithPartner Tests
  // ==================================================================================

  describe('shareChannelWithPartner', () => {
    it('should successfully share a channel with a partner', async () => {
      const result = await SELF.shareChannelWithPartner('default', testChannel1.id, testOrg2, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toHaveProperty('channelId', testChannel1.id);
        expect(result.data).toHaveProperty('partnerOrgId', testOrg2);
        expect(result.data).toHaveProperty('message');
      }

      // Verify share exists in AuthZed
      const exists = await env.AUTHZED.channelShareExists(testChannel1.id, testOrg2);
      expect(exists).toBe(true);
    });

    it('should fail when user is not a data custodian', async () => {
      const result = await SELF.shareChannelWithPartner(
        'default',
        testChannel1.id,
        testOrg2,
        { cfToken: userToken }, // Regular user, not custodian
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('permission');
      }
    });

    it('should fail when channel does not exist', async () => {
      const result = await SELF.shareChannelWithPartner(
        'default',
        'nonexistent-channel-id',
        testOrg2,
        { cfToken: custodianToken },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('catalyst unable to find data channel');
      }
    });

    it('should fail when user does not own the channel', async () => {
      // Create a channel owned by a different org
      const doId = env.DO.idFromName('default');
      const stub = env.DO.get(doId);
      const otherOrgChannel = await stub.create({
        name: 'Other Org Channel',
        endpoint: 'https://example.com/other',
        creatorOrganization: testOrg2, // Owned by different org
        accessSwitch: true,
        description: 'Channel owned by another org',
      });

      const result = await SELF.shareChannelWithPartner('default', otherOrgChannel.id, testOrg3, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('catalyst asserts user does not own this data channel');
      }
    });

    it('should fail when partnership does not exist', async () => {
      const nonPartnerOrg = 'non-partner-org';

      const result = await SELF.shareChannelWithPartner('default', testChannel1.id, nonPartnerOrg, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          'catalyst requires an existing partnership before sharing channels',
        );
      }
    });

    it('should be idempotent - sharing twice succeeds', async () => {
      // First share
      const result1 = await SELF.shareChannelWithPartner('default', testChannel1.id, testOrg2, {
        cfToken: custodianToken,
      });
      expect(result1.success).toBe(true);

      // Second share (should not fail)
      const result2 = await SELF.shareChannelWithPartner('default', testChannel1.id, testOrg2, {
        cfToken: custodianToken,
      });
      expect(result2.success).toBe(true);
    });
  });

  // ==================================================================================
  // revokeChannelShare Tests
  // ==================================================================================

  describe('revokeChannelShare', () => {
    beforeEach(async () => {
      // Pre-share channel1 with org2 for revocation tests
      await env.AUTHZED.addChannelShare(testChannel1.id, testOrg2);
    });

    it('should successfully revoke a channel share', async () => {
      // Verify share exists before revocation
      const existsBefore = await env.AUTHZED.channelShareExists(testChannel1.id, testOrg2);
      expect(existsBefore).toBe(true);

      const result = await SELF.revokeChannelShare('default', testChannel1.id, testOrg2, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('channelId', testChannel1.id);
        expect(result.data).toHaveProperty('partnerOrgId', testOrg2);
      }

      // Verify share no longer exists
      const existsAfter = await env.AUTHZED.channelShareExists(testChannel1.id, testOrg2);
      expect(existsAfter).toBe(false);
    });

    it('should fail when user is not a data custodian', async () => {
      const result = await SELF.revokeChannelShare('default', testChannel1.id, testOrg2, {
        cfToken: userToken,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('permission');
      }
    });

    it('should fail when channel does not exist', async () => {
      const result = await SELF.revokeChannelShare('default', 'nonexistent-channel-id', testOrg2, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('catalyst unable to find data channel');
      }
    });

    it('should fail when user does not own the channel', async () => {
      const doId = env.DO.idFromName('default');
      const stub = env.DO.get(doId);
      const otherOrgChannel = await stub.create({
        name: 'Other Org Channel',
        endpoint: 'https://example.com/other',
        creatorOrganization: testOrg2,
        accessSwitch: true,
        description: 'Channel owned by another org',
      });

      const result = await SELF.revokeChannelShare('default', otherOrgChannel.id, testOrg3, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('catalyst asserts user does not own this data channel');
      }
    });

    it('should be idempotent - revoking twice succeeds', async () => {
      // First revoke
      const result1 = await SELF.revokeChannelShare('default', testChannel1.id, testOrg2, {
        cfToken: custodianToken,
      });
      expect(result1.success).toBe(true);

      // Second revoke (should not fail - AuthZed deletes are idempotent)
      const result2 = await SELF.revokeChannelShare('default', testChannel1.id, testOrg2, {
        cfToken: custodianToken,
      });
      expect(result2.success).toBe(true);
    });
  });

  // ==================================================================================
  // listChannelShares Tests
  // ==================================================================================

  describe('listChannelShares', () => {
    beforeEach(async () => {
      // Share testChannel1 with multiple partners
      await env.AUTHZED.addChannelShare(testChannel1.id, testOrg2);
      await env.AUTHZED.addChannelShare(testChannel1.id, testOrg3);
    });

    it('should list all partners with access to a channel', async () => {
      const result = await SELF.listChannelShares('default', testChannel1.id, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('channelId', testChannel1.id);
        expect(result.data).toHaveProperty('partners');
        expect(result.data).toHaveProperty('count', 2);
        expect(result.data.partners).toContain(testOrg2);
        expect(result.data.partners).toContain(testOrg3);
      }
    });

    it('should return empty list for channel with no shares', async () => {
      const result = await SELF.listChannelShares('default', testChannel2.id, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(0);
        expect(result.data.partners).toEqual([]);
      }
    });

    it('should fail when user cannot read the channel', async () => {
      // Create a channel user cannot access
      const doId = env.DO.idFromName('default');
      const stub = env.DO.get(doId);
      const restrictedChannel = await stub.create({
        name: 'Restricted Channel',
        endpoint: 'https://example.com/restricted',
        creatorOrganization: testOrg2, // Different org
        accessSwitch: true,
        description: 'Channel user cannot access',
      });

      const result = await SELF.listChannelShares('default', restrictedChannel.id, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('permission');
      }
    });

    it('should allow regular users to list shares for readable channels', async () => {
      const result = await SELF.listChannelShares(
        'default',
        testChannel1.id,
        { cfToken: userToken }, // Regular user, not custodian
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(2);
      }
    });
  });

  // ==================================================================================
  // listSharedChannels Tests
  // ==================================================================================

  describe('listSharedChannels', () => {
    beforeEach(async () => {
      // Share both channels with testOrg2
      await env.AUTHZED.addChannelShare(testChannel1.id, testOrg2);
      await env.AUTHZED.addChannelShare(testChannel2.id, testOrg2);

      // Share only channel1 with testOrg3
      await env.AUTHZED.addChannelShare(testChannel1.id, testOrg3);
    });

    it('should list all channels shared with a partner', async () => {
      const result = await SELF.listSharedChannels('default', testOrg2, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('partnerOrgId', testOrg2);
        expect(result.data).toHaveProperty('channels');
        expect(result.data).toHaveProperty('count', 2);

        const channelIds = result.data.channels.map((c: DataChannel) => c.id);
        expect(channelIds).toContain(testChannel1.id);
        expect(channelIds).toContain(testChannel2.id);
      }
    });

    it('should return empty list for partner with no shares', async () => {
      const nonSharedPartner = 'non-shared-partner';
      await env.AUTHZED.addPartnerToOrg(testOrg1, nonSharedPartner);

      const result = await SELF.listSharedChannels('default', nonSharedPartner, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(0);
        expect(result.data.channels).toEqual([]);
      }
    });

    it('should filter channels by user permissions', async () => {
      // testOrg3 has access to only channel1
      const result = await SELF.listSharedChannels('default', testOrg3, {
        cfToken: custodianToken,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(1);
        expect(result.data.channels[0].id).toBe(testChannel1.id);
      }
    });

    it('should fail without user token', async () => {
      const result = await SELF.listSharedChannels(
        'default',
        testOrg2,
        {}, // No token
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('catalyst requires user token to list shared channels');
      }
    });
  });

  // ==================================================================================
  // End-to-End Workflow Tests
  // ==================================================================================

  describe('End-to-End Workflow', () => {
    it('should support complete share lifecycle', async () => {
      // 1. List shares (should be empty initially)
      let listResult = await SELF.listChannelShares('default', testChannel1.id, {
        cfToken: custodianToken,
      });
      expect(listResult.success).toBe(true);
      if (listResult.success) {
        expect(listResult.data.count).toBe(0);
      }

      // 2. Share channel with partner
      const shareResult = await SELF.shareChannelWithPartner('default', testChannel1.id, testOrg2, {
        cfToken: custodianToken,
      });
      expect(shareResult.success).toBe(true);

      // 3. Verify share appears in list
      listResult = await SELF.listChannelShares('default', testChannel1.id, {
        cfToken: custodianToken,
      });
      expect(listResult.success).toBe(true);
      if (listResult.success) {
        expect(listResult.data.count).toBe(1);
        expect(listResult.data.partners).toContain(testOrg2);
      }

      // 4. Verify partner can see the channel
      const partnerChannels = await SELF.listSharedChannels('default', testOrg2, {
        cfToken: custodianToken,
      });
      expect(partnerChannels.success).toBe(true);
      if (partnerChannels.success) {
        const channelIds = partnerChannels.data.channels.map((c: DataChannel) => c.id);
        expect(channelIds).toContain(testChannel1.id);
      }

      // 5. Revoke share
      const revokeResult = await SELF.revokeChannelShare('default', testChannel1.id, testOrg2, {
        cfToken: custodianToken,
      });
      expect(revokeResult.success).toBe(true);

      // 6. Verify share no longer appears
      listResult = await SELF.listChannelShares('default', testChannel1.id, {
        cfToken: custodianToken,
      });
      expect(listResult.success).toBe(true);
      if (listResult.success) {
        expect(listResult.data.count).toBe(0);
      }
    });
  });
});
