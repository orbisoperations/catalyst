import { DataChannel } from '@catalyst/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Registrar } from '../../src/worker';

// Helper type for accessing private methods during testing
type RegistrarTestHelper = {
  extractNameFromLegacyFormat: (name: string) => string;
  migrateLegacyNameFormat: (dc: DataChannel) => Promise<boolean>;
};

/**
 * Unit tests for lazy migration of data channel names
 * Tests the migration of names from "creatorOrganization/name" format to "name" format
 */
describe('Registrar Lazy Migration - Unit Tests', () => {
  let registrar: Registrar;
  let mockStorageMap: Map<string, DataChannel>;
  let mockCtx: {
    storage: {
      get: ReturnType<typeof vi.fn>;
      put: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      list: ReturnType<typeof vi.fn>;
    };
    blockConcurrencyWhile: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Initialize mock storage
    mockStorageMap = new Map();

    // Create an async iterable that works like the real storage.list()
    const createAsyncIterable = () => {
      const entries = Array.from(mockStorageMap.entries());
      return {
        [Symbol.asyncIterator]: async function* () {
          for (const [key, value] of entries) {
            yield [key, value];
          }
        },
        entries: function* () {
          for (const [key, value] of entries) {
            yield [key, value];
          }
        },
        values: function* () {
          for (const [, value] of entries) {
            yield value;
          }
        },
      };
    };

    // Create mock context with storage operations
    mockCtx = {
      storage: {
        get: vi.fn(async (id: string) => mockStorageMap.get(id)),
        put: vi.fn(async (id: string, value: DataChannel) => {
          mockStorageMap.set(id, value);
        }),
        delete: vi.fn(async (id: string) => {
          return mockStorageMap.delete(id);
        }),
        list: vi.fn(() => createAsyncIterable()),
      },
      blockConcurrencyWhile: vi.fn(async (callback: () => Promise<void>) => {
        await callback();
      }),
    };

    // Create Registrar instance with mocked context
    registrar = Object.create(Registrar.prototype);
    (registrar as unknown as { ctx: typeof mockCtx }).ctx = mockCtx;
  });

  describe('extractNameFromLegacyFormat', () => {
    it('should extract name from legacy format "org/name"', () => {
      const result = (registrar as unknown as RegistrarTestHelper).extractNameFromLegacyFormat(
        'acme-corp/my-channel',
      );
      expect(result).toBe('my-channel');
    });

    it('should handle multiple slashes by taking the last part', () => {
      const result = (registrar as unknown as RegistrarTestHelper).extractNameFromLegacyFormat(
        'acme/corp/my-channel',
      );
      expect(result).toBe('my-channel');
    });

    it('should return name as-is when no slash exists', () => {
      const result = (registrar as unknown as RegistrarTestHelper).extractNameFromLegacyFormat(
        'my-channel',
      );
      expect(result).toBe('my-channel');
    });

    it('should handle empty string', () => {
      const result = (registrar as unknown as RegistrarTestHelper).extractNameFromLegacyFormat('');
      expect(result).toBe('');
    });

    it('should handle slash at the end', () => {
      const result = (registrar as unknown as RegistrarTestHelper).extractNameFromLegacyFormat(
        'acme-corp/',
      );
      expect(result).toBe('');
    });

    it('should handle slash at the beginning', () => {
      const result = (registrar as unknown as RegistrarTestHelper).extractNameFromLegacyFormat(
        '/my-channel',
      );
      expect(result).toBe('my-channel');
    });
  });

  describe('migrateLegacyNameFormat', () => {
    it('should migrate channel with legacy format and persist to storage', async () => {
      const legacyChannel: DataChannel = {
        id: 'channel-1',
        name: 'acme-corp/my-channel',
        description: 'Test channel',
        endpoint: 'https://example.com/graphql',
        creatorOrganization: 'acme-corp',
        accessSwitch: true,
      };

      const result = await (registrar as unknown as RegistrarTestHelper).migrateLegacyNameFormat(
        legacyChannel,
      );

      expect(result).toBe(true);
      expect(legacyChannel.name).toBe('my-channel');
      expect((mockCtx.storage.put as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
        0,
      );
      expect(mockCtx.blockConcurrencyWhile).toHaveBeenCalled();
    });

    it('should not migrate channel with new format', async () => {
      const newChannel: DataChannel = {
        id: 'channel-2',
        name: 'my-channel',
        description: 'Test channel',
        endpoint: 'https://example.com/graphql',
        creatorOrganization: 'acme-corp',
        accessSwitch: true,
      };

      const result = await (registrar as unknown as RegistrarTestHelper).migrateLegacyNameFormat(
        newChannel,
      );

      expect(result).toBe(false);
      expect(newChannel.name).toBe('my-channel');
      expect(mockCtx.storage.put).not.toHaveBeenCalled();
    });

    it('should return false and not persist when no migration needed', async () => {
      const channel: DataChannel = {
        id: 'channel-3',
        name: 'simple-name',
        description: 'Test channel',
        endpoint: 'https://example.com/graphql',
        creatorOrganization: 'acme-corp',
        accessSwitch: true,
      };

      const initialPutCount = (mockCtx.storage.put as ReturnType<typeof vi.fn>).mock.calls.length;
      const result = await (registrar as unknown as RegistrarTestHelper).migrateLegacyNameFormat(
        channel,
      );

      expect(result).toBe(false);
      expect((mockCtx.storage.put as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
        initialPutCount,
      );
    });

    it('should handle migration with special characters in name', async () => {
      const channel: DataChannel = {
        id: 'channel-4',
        name: 'acme-corp/my-channel-123_v2',
        description: 'Test channel',
        endpoint: 'https://example.com/graphql',
        creatorOrganization: 'acme-corp',
        accessSwitch: true,
      };

      const result = await (registrar as unknown as RegistrarTestHelper).migrateLegacyNameFormat(
        channel,
      );

      expect(result).toBe(true);
      expect(channel.name).toBe('my-channel-123_v2');
    });
  });

  describe('get method - lazy migration on single channel', () => {
    it('should migrate channel when getting with legacy format', async () => {
      const legacyChannel: DataChannel = {
        id: 'channel-1',
        name: 'acme-corp/my-channel',
        description: 'Test channel',
        endpoint: 'https://example.com/graphql',
        creatorOrganization: 'acme-corp',
        accessSwitch: true,
      };

      mockStorageMap.set('channel-1', legacyChannel);

      const result = await registrar.get('channel-1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('my-channel');
      expect(mockCtx.storage.put).toHaveBeenCalledWith(
        'channel-1',
        expect.objectContaining({ name: 'my-channel' }),
      );
    });

    it('should not re-migrate channel that is already migrated', async () => {
      const migratedChannel: DataChannel = {
        id: 'channel-2',
        name: 'my-channel',
        description: 'Test channel',
        endpoint: 'https://example.com/graphql',
        creatorOrganization: 'acme-corp',
        accessSwitch: true,
      };

      mockStorageMap.set('channel-2', migratedChannel);

      const result = await registrar.get('channel-2');

      expect(result).toBeDefined();
      expect(result?.name).toBe('my-channel');
      expect(mockCtx.storage.put).not.toHaveBeenCalled();
    });

    it('should return undefined when channel does not exist', async () => {
      const result = await registrar.get('non-existent');

      expect(result).toBeUndefined();
      expect(mockCtx.storage.put).not.toHaveBeenCalled();
    });

    it('should respect filterByAccessSwitch flag', async () => {
      const disabledChannel: DataChannel = {
        id: 'channel-3',
        name: 'acme-corp/my-channel',
        description: 'Test channel',
        endpoint: 'https://example.com/graphql',
        creatorOrganization: 'acme-corp',
        accessSwitch: false,
      };

      mockStorageMap.set('channel-3', disabledChannel);

      // Should still return when filterByAccessSwitch is false
      let result = await registrar.get('channel-3', false);
      expect(result).toBeDefined();

      // Should return undefined when filterByAccessSwitch is true and accessSwitch is false
      result = await registrar.get('channel-3', true);
      expect(result).toBeUndefined();
    });
  });

  describe('list method - lazy migration on multiple channels', () => {
    it('should migrate all channels with legacy format', async () => {
      const channels: DataChannel[] = [
        {
          id: 'channel-1',
          name: 'acme-corp/channel-1',
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: true,
        },
        {
          id: 'channel-2',
          name: 'beta-org/channel-2',
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'beta-org',
          accessSwitch: true,
        },
        {
          id: 'channel-3',
          name: 'simple-name',
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: true,
        },
      ];

      channels.forEach(ch => mockStorageMap.set(ch.id, ch));

      const result = await registrar.list();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('channel-1');
      expect(result[1].name).toBe('channel-2');
      expect(result[2].name).toBe('simple-name');

      // Should have persisted 2 migrations
      expect(mockCtx.storage.put).toHaveBeenCalledTimes(2);
    });

    it('should filter by accessSwitch when requested', async () => {
      const channels: DataChannel[] = [
        {
          id: 'channel-1',
          name: 'acme-corp/enabled',
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: true,
        },
        {
          id: 'channel-2',
          name: 'acme-corp/disabled',
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: false,
        },
      ];

      channels.forEach(ch => mockStorageMap.set(ch.id, ch));

      const result = await registrar.list(true);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('enabled');
      expect(result[0].accessSwitch).toBe(true);
    });

    it('should handle empty storage', async () => {
      const result = await registrar.list();

      expect(result).toEqual([]);
      expect(mockCtx.storage.put).not.toHaveBeenCalled();
    });

    it('should return all channels without filtering when filterByAccessSwitch is false', async () => {
      const channels: DataChannel[] = [
        {
          id: 'channel-1',
          name: 'acme-corp/enabled',
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: true,
        },
        {
          id: 'channel-2',
          name: 'acme-corp/disabled',
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: false,
        },
      ];

      channels.forEach(ch => mockStorageMap.set(ch.id, ch));

      const result = await registrar.list(false);

      expect(result).toHaveLength(2);
    });
  });

  describe('checkNameUniqueness - handling both formats', () => {
    it('should detect duplicate names across legacy and new formats', async () => {
      const channels: DataChannel[] = [
        {
          id: 'channel-1',
          name: 'acme-corp/my-channel', // legacy format
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: true,
        },
      ];

      mockStorageMap.set('channel-1', channels[0]);

      // Should return false because "my-channel" already exists (in legacy format)
      const result = await registrar.checkNameUniqueness('my-channel', 'acme-corp');

      expect(result).toBe(false);
    });

    it('should be case-insensitive across formats', async () => {
      const channels: DataChannel[] = [
        {
          id: 'channel-1',
          name: 'acme-corp/My-Channel',
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: true,
        },
      ];

      mockStorageMap.set('channel-1', channels[0]);

      const result = await registrar.checkNameUniqueness('my-channel', 'acme-corp');

      expect(result).toBe(false);
    });

    it('should allow same name in different organizations', async () => {
      const channels: DataChannel[] = [
        {
          id: 'channel-1',
          name: 'acme-corp/my-channel',
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: true,
        },
      ];

      mockStorageMap.set('channel-1', channels[0]);

      const result = await registrar.checkNameUniqueness('my-channel', 'different-org');

      expect(result).toBe(true);
    });

    it('should exclude specified channel from uniqueness check', async () => {
      const channels: DataChannel[] = [
        {
          id: 'channel-1',
          name: 'acme-corp/my-channel',
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: true,
        },
      ];

      mockStorageMap.set('channel-1', channels[0]);

      // Should return true because we're excluding the channel being updated
      const result = await registrar.checkNameUniqueness('my-channel', 'acme-corp', 'channel-1');

      expect(result).toBe(true);
    });

    it('should handle mixed legacy and new format names', async () => {
      const channels: DataChannel[] = [
        {
          id: 'channel-1',
          name: 'acme-corp/channel-one', // legacy
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: true,
        },
        {
          id: 'channel-2',
          name: 'channel-two', // new format
          description: 'Test',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'acme-corp',
          accessSwitch: true,
        },
      ];

      mockStorageMap.set('channel-1', channels[0]);
      mockStorageMap.set('channel-2', channels[1]);

      // Check for channel-one (in legacy format)
      let result = await registrar.checkNameUniqueness('channel-one', 'acme-corp');
      expect(result).toBe(false);

      // Check for channel-two (in new format)
      result = await registrar.checkNameUniqueness('channel-two', 'acme-corp');
      expect(result).toBe(false);

      // Check for new unique name
      result = await registrar.checkNameUniqueness('channel-three', 'acme-corp');
      expect(result).toBe(true);
    });
  });

  describe('Migration consistency', () => {
    it('should maintain data consistency during migration', async () => {
      const originalChannel: DataChannel = {
        id: 'channel-1',
        name: 'acme-corp/my-channel',
        description: 'Original description',
        endpoint: 'https://example.com/graphql',
        creatorOrganization: 'acme-corp',
        accessSwitch: true,
      };

      mockStorageMap.set('channel-1', originalChannel);

      // Get should trigger migration
      const retrieved = await registrar.get('channel-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('channel-1');
      expect(retrieved?.name).toBe('my-channel');
      expect(retrieved?.description).toBe('Original description');
      expect(retrieved?.endpoint).toBe('https://example.com/graphql');
      expect(retrieved?.creatorOrganization).toBe('acme-corp');
      expect(retrieved?.accessSwitch).toBe(true);
    });

    it('should handle concurrent migrations safely with blockConcurrencyWhile', async () => {
      const channel: DataChannel = {
        id: 'channel-1',
        name: 'acme-corp/my-channel',
        description: 'Test',
        endpoint: 'https://example.com/graphql',
        creatorOrganization: 'acme-corp',
        accessSwitch: true,
      };

      mockStorageMap.set('channel-1', channel);

      await registrar.get('channel-1');

      // blockConcurrencyWhile should have been called for safe migration
      expect(mockCtx.blockConcurrencyWhile).toHaveBeenCalled();
    });
  });
});
