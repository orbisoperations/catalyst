import { beforeEach, describe, expect, it, vi } from 'vitest';
import DataChannelCertifierWorker from '../../src/worker';

describe('Scheduled Validation', () => {
  let mockEnv: Env;

  beforeEach(() => {
    // Mock the environment
    mockEnv = {
      AUTHX_TOKEN_API: {
        signSystemJWT: vi.fn().mockResolvedValue({
          success: true,
          token: 'valid.system.token',
          expiration: Date.now() + 300000,
        }),
      },
      DATA_CHANNEL_REGISTRAR: {
        listAll: vi.fn(),
        updateAccessSwitch: vi.fn(),
      },
    } as Env;
  });

  describe('scheduled()', () => {
    it('should skip validation when no channels exist', async () => {
      mockEnv.DATA_CHANNEL_REGISTRAR.listAll = vi.fn().mockResolvedValue(null);

      const consoleSpy = vi.spyOn(console, 'log');

      const worker = Object.create(DataChannelCertifierWorker.prototype);
      worker.env = mockEnv;

      await worker.scheduled();

      expect(mockEnv.DATA_CHANNEL_REGISTRAR.listAll).toHaveBeenCalledWith();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DataChannelCertifier] No channels found to validate'
      );
    });

    it('should skip validation when no enabled channels exist', async () => {
      const disabledChannels = [
        {
          id: 'channel-1',
          name: 'Disabled Channel',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'org-1',
          accessSwitch: false,
          description: 'A disabled channel',
        },
      ];

      mockEnv.DATA_CHANNEL_REGISTRAR.listAll = vi.fn().mockResolvedValue(disabledChannels);

      const consoleSpy = vi.spyOn(console, 'log');

      const worker = Object.create(DataChannelCertifierWorker.prototype);
      worker.env = mockEnv;

      await worker.scheduled();

      expect(mockEnv.DATA_CHANNEL_REGISTRAR.listAll).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DataChannelCertifier] No enabled channels to validate'
      );
    });

    it('should validate only enabled channels', async () => {
      const mixedChannels = [
        {
          id: 'channel-1',
          name: 'Enabled Channel 1',
          endpoint: 'https://example1.com/graphql',
          creatorOrganization: 'org-1',
          accessSwitch: true,
          description: 'An enabled channel',
        },
        {
          id: 'channel-2',
          name: 'Disabled Channel',
          endpoint: 'https://example2.com/graphql',
          creatorOrganization: 'org-2',
          accessSwitch: false,
          description: 'A disabled channel',
        },
        {
          id: 'channel-3',
          name: 'Enabled Channel 2',
          endpoint: 'https://example3.com/graphql',
          creatorOrganization: 'org-3',
          accessSwitch: true,
          description: 'Another enabled channel',
        },
      ];

      mockEnv.DATA_CHANNEL_REGISTRAR.listAll = vi.fn().mockResolvedValue(mixedChannels);

      const worker = Object.create(DataChannelCertifierWorker.prototype);
      worker.env = mockEnv;

      // Mock validateBulkChannels to track what channels it receives
      const validateSpy = vi.spyOn(worker, 'validateBulkChannels').mockResolvedValue({
        timestamp: Date.now(),
        totalChannels: 2,
        validChannels: 2,
        invalidChannels: 0,
        errorChannels: 0,
        results: [],
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await worker.scheduled();

      // Should only validate the 2 enabled channels
      expect(validateSpy).toHaveBeenCalledWith([mixedChannels[0], mixedChannels[2]]);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DataChannelCertifier] Validating 2 enabled channels (3 total)'
      );
    });

    it('should handle validation errors gracefully', async () => {
      const channels = [
        {
          id: 'channel-1',
          name: 'Test Channel',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'org-1',
          accessSwitch: true,
          description: 'Test channel',
        },
      ];

      mockEnv.DATA_CHANNEL_REGISTRAR.listAll = vi.fn().mockResolvedValue(channels);

      const worker = Object.create(DataChannelCertifierWorker.prototype);
      worker.env = mockEnv;

      // Mock validateBulkChannels to throw an error
      vi.spyOn(worker, 'validateBulkChannels').mockRejectedValue(new Error('Validation failed'));

      const consoleSpy = vi.spyOn(console, 'error');

      // Should not throw, but log the error
      await worker.scheduled();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DataChannelCertifier] Scheduled validation failed:',
        expect.any(Error)
      );
    });

    it('should log validation summary after completion', async () => {
      const channels = [
        {
          id: 'channel-1',
          name: 'Channel 1',
          endpoint: 'https://example1.com/graphql',
          creatorOrganization: 'org-1',
          accessSwitch: true,
          description: 'Channel 1',
        },
        {
          id: 'channel-2',
          name: 'Channel 2',
          endpoint: 'https://example2.com/graphql',
          creatorOrganization: 'org-2',
          accessSwitch: true,
          description: 'Channel 2',
        },
      ];

      mockEnv.DATA_CHANNEL_REGISTRAR.listAll = vi.fn().mockResolvedValue(channels);

      const worker = Object.create(DataChannelCertifierWorker.prototype);
      worker.env = mockEnv;

      vi.spyOn(worker, 'validateBulkChannels').mockResolvedValue({
        timestamp: Date.now(),
        totalChannels: 2,
        validChannels: 1,
        invalidChannels: 1,
        errorChannels: 0,
        results: [],
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await worker.scheduled();

      expect(consoleSpy).toHaveBeenCalledWith('[DataChannelCertifier] Validation complete:', {
        total: 2,
        valid: 1,
        invalid: 1,
        errors: 0,
      });
    });
  });

  describe('validateBulkChannels()', () => {
    it('should fetch channels from registrar if none provided', async () => {
      const channels = [
        {
          id: 'channel-1',
          name: 'Channel 1',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'org-1',
          accessSwitch: true,
          description: 'Test channel',
        },
      ];

      mockEnv.DATA_CHANNEL_REGISTRAR.listAll = vi.fn().mockResolvedValue(channels);

      // Mock fetch for the validation
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
      } as Response);

      const worker = Object.create(DataChannelCertifierWorker.prototype);
      worker.env = mockEnv;

      const result = await worker.validateBulkChannels();

      expect(mockEnv.DATA_CHANNEL_REGISTRAR.listAll).toHaveBeenCalled();
      expect(result.totalChannels).toBe(1);
    });

    it('should filter disabled channels when fetching from registrar', async () => {
      const mixedChannels = [
        {
          id: 'channel-1',
          name: 'Enabled Channel',
          endpoint: 'https://example1.com/graphql',
          creatorOrganization: 'org-1',
          accessSwitch: true,
          description: 'Enabled',
        },
        {
          id: 'channel-2',
          name: 'Disabled Channel',
          endpoint: 'https://example2.com/graphql',
          creatorOrganization: 'org-2',
          accessSwitch: false,
          description: 'Disabled',
        },
      ];

      mockEnv.DATA_CHANNEL_REGISTRAR.listAll = vi.fn().mockResolvedValue(mixedChannels);

      // Mock fetch for the validation
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
      } as Response);

      const worker = Object.create(DataChannelCertifierWorker.prototype);
      worker.env = mockEnv;

      const result = await worker.validateBulkChannels();

      // Should only validate the enabled channel
      expect(result.totalChannels).toBe(1);
    });
  });
});
