import { DataChannel } from '@catalyst/schemas';
import { env, SELF } from 'cloudflare:test';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Skip these tests if AuthZed is not available
describe.skip('RegistrarWorker listAll tests', () => {
  const orgAdminToken = 'org-admin-token';
  const custodianToken = 'cf-custodian-token';
  const channelsToCreate: Omit<DataChannel, 'id'>[] = [
    {
      name: 'Test Channel 1',
      description: 'Active channel',
      endpoint: 'https://example1.com/graphql',
      creatorOrganization: 'test-org-1',
      accessSwitch: true,
    },
    {
      name: 'Test Channel 2',
      description: 'Another active channel',
      endpoint: 'https://example2.com/graphql',
      creatorOrganization: 'test-org-2',
      accessSwitch: true,
    },
    {
      name: 'Test Channel 3',
      description: 'Disabled channel',
      endpoint: 'https://example3.com/graphql',
      creatorOrganization: 'test-org-1',
      accessSwitch: false,
    },
  ];

  beforeAll(async () => {
    // Clean up any existing channels
    const existingChannels = await SELF.list('default', { cfToken: custodianToken });
    if (existingChannels.success && existingChannels.data) {
      for (const channel of existingChannels.data) {
        await SELF.remove('default', channel.id, { cfToken: custodianToken });
      }
    }
  });

  afterEach(async () => {
    // Clean up created channels after each test
    const existingChannels = await SELF.list('default', { cfToken: custodianToken });
    if (existingChannels.success && existingChannels.data) {
      for (const channel of existingChannels.data) {
        await SELF.remove('default', channel.id, { cfToken: custodianToken });
      }
    }
  });

  describe('listAll method', () => {
    it('should return an empty array when no channels exist', async () => {
      // Test the listAll method directly on the Durable Object
      const doId = env.DO.idFromName('default');
      const stub = env.DO.get(doId);

      // Get list directly from DO
      const doList = await stub.list();
      expect(doList).toBeInstanceOf(Array);
      expect(doList).toHaveLength(0);

      // Now test the worker method
      const result = await SELF.listAll();
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);
    });

    it('should return all channels without permission filtering', async () => {
      // Create channels directly in the Durable Object (bypassing permission checks)
      const doId = env.DO.idFromName('default');
      const stub = env.DO.get(doId);

      // Create channels directly in DO
      for (const channelData of channelsToCreate) {
        await stub.create(channelData);
      }

      // Verify channels were created
      const doList = await stub.list();
      expect(doList).toHaveLength(3);

      // Call listAll - should return ALL channels
      const result = await SELF.listAll();

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(3);

      // Verify all channels are returned
      const channelNames = result!.map(ch => ch.name);
      expect(channelNames).toContain('Test Channel 1');
      expect(channelNames).toContain('Test Channel 2');
      expect(channelNames).toContain('Test Channel 3');
    });

    it('should return channels with both enabled and disabled accessSwitch', async () => {
      // Create channels
      for (const channelData of channelsToCreate) {
        await SELF.create('default', channelData, { cfToken: custodianToken });
      }

      const result = await SELF.listAll();

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);

      // Check that we have both enabled and disabled channels
      const enabledChannels = result!.filter(ch => ch.accessSwitch === true);
      const disabledChannels = result!.filter(ch => ch.accessSwitch === false);

      expect(enabledChannels).toHaveLength(2);
      expect(disabledChannels).toHaveLength(1);
    });

    it('should work with a custom namespace', async () => {
      // Create a channel in the default namespace
      const createResponse = await SELF.create('default', channelsToCreate[0], {
        cfToken: custodianToken,
      });
      expect(createResponse.success).toBe(true);

      // List from default namespace
      const defaultResult = await SELF.listAll('default');
      expect(defaultResult).toHaveLength(1);

      // List from a different namespace (should be empty)
      const customResult = await SELF.listAll('custom-namespace');
      expect(customResult).toBeDefined();
      expect(customResult).toHaveLength(0);
    });

    it('should return null on error', async () => {
      // Mock an error scenario by passing invalid namespace
      // This would need proper error injection in a real test environment
      // For now, we just verify the method handles edge cases

      const result = await SELF.listAll('');

      // The method should handle this gracefully
      expect(result === null || Array.isArray(result)).toBe(true);
    });
  });

  describe('listAll vs list comparison', () => {
    it('list filters by permissions while listAll does not', async () => {
      // Create channels as a custodian
      for (const channelData of channelsToCreate) {
        await SELF.create('default', channelData, { cfToken: custodianToken });
      }

      // Regular list with token - filtered by permissions
      const listResult = await SELF.list('default', { cfToken: orgAdminToken });

      // ListAll without token - returns everything
      const listAllResult = await SELF.listAll();

      expect(listAllResult).toBeDefined();
      expect(listAllResult!.length).toBeGreaterThanOrEqual(listResult.data?.length || 0);

      // listAll should return all 3 channels
      expect(listAllResult).toHaveLength(3);
    });
  });
});
