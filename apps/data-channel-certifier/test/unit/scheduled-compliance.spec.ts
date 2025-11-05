import { beforeEach, describe, expect, it, vi } from 'vitest';
import DataChannelCertifierWorker from '../../src/worker';

describe('Scheduled Compliance', () => {
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
    it('should skip compliance check when no channels exist', async () => {
      mockEnv.DATA_CHANNEL_REGISTRAR.listAll = vi.fn().mockResolvedValue(null);

      const consoleSpy = vi.spyOn(console, 'log');

      const worker = Object.create(DataChannelCertifierWorker.prototype);
      worker.env = mockEnv;

      await worker.scheduled();

      expect(mockEnv.DATA_CHANNEL_REGISTRAR.listAll).toHaveBeenCalledWith('default', true);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DataChannelCertifier] No enabled channels to certify'
      );
    });

    it('should skip compliance check when no enabled channels exist', async () => {
      // When asking for only enabled channels, registrar returns empty array
      mockEnv.DATA_CHANNEL_REGISTRAR.listAll = vi.fn().mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, 'log');

      const worker = Object.create(DataChannelCertifierWorker.prototype);
      worker.env = mockEnv;

      await worker.scheduled();

      expect(mockEnv.DATA_CHANNEL_REGISTRAR.listAll).toHaveBeenCalledWith('default', true);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DataChannelCertifier] No enabled channels to certify'
      );
    });

    it('should certify only enabled channels', async () => {
      // Now the registrar only returns enabled channels when called with true flag
      const enabledChannels = [
        {
          id: 'channel-1',
          name: 'Enabled Channel 1',
          endpoint: 'https://example1.com/graphql',
          creatorOrganization: 'org-1',
          accessSwitch: true,
          description: 'An enabled channel',
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

      mockEnv.DATA_CHANNEL_REGISTRAR.listAll = vi.fn().mockResolvedValue(enabledChannels);

      const worker = Object.create(DataChannelCertifierWorker.prototype);
      worker.env = mockEnv;

      // Mock verifyBulkCompliance to track what channels it receives
      const validateSpy = vi.spyOn(worker, 'verifyBulkCompliance').mockResolvedValue({
        timestamp: Date.now(),
        totalChannels: 2,
        compliantChannels: 2,
        nonCompliantChannels: 0,
        errorChannels: 0,
        results: [],
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await worker.scheduled();

      // Should validate the 2 enabled channels returned by registrar
      expect(validateSpy).toHaveBeenCalledWith(enabledChannels);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DataChannelCertifier] Certifying 2 enabled channels'
      );
    });

    it('should handle compliance check errors gracefully', async () => {
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

      // Mock verifyBulkCompliance to throw an error
      vi.spyOn(worker, 'verifyBulkCompliance').mockRejectedValue(new Error('Validation failed'));

      const consoleSpy = vi.spyOn(console, 'error');

      // Should not throw, but log the error
      await worker.scheduled();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DataChannelCertifier] Scheduled compliance check failed:',
        expect.any(Error)
      );
    });

    it('should log certification summary after completion', async () => {
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

      vi.spyOn(worker, 'verifyBulkCompliance').mockResolvedValue({
        timestamp: Date.now(),
        totalChannels: 2,
        compliantChannels: 1,
        nonCompliantChannels: 1,
        errorChannels: 0,
        results: [],
      });

      const consoleSpy = vi.spyOn(console, 'log');

      await worker.scheduled();

      expect(consoleSpy).toHaveBeenCalledWith('[DataChannelCertifier] Compliance check complete:', {
        total: 2,
        compliant: 1,
        non_compliant: 1,
        errors: 0,
      });
    });
  });

  describe('verifyBulkCompliance()', () => {
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

      const result = await worker.verifyBulkCompliance();

      expect(mockEnv.DATA_CHANNEL_REGISTRAR.listAll).toHaveBeenCalledWith('default', true);
      expect(result.totalChannels).toBe(1);
    });

    it('should only receive enabled channels from registrar', async () => {
      // The registrar with true flag only returns enabled channels
      const enabledChannels = [
        {
          id: 'channel-1',
          name: 'Enabled Channel',
          endpoint: 'https://example1.com/graphql',
          creatorOrganization: 'org-1',
          accessSwitch: true,
          description: 'Enabled',
        },
      ];

      mockEnv.DATA_CHANNEL_REGISTRAR.listAll = vi.fn().mockResolvedValue(enabledChannels);

      // Mock fetch for the validation
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
      } as Response);

      const worker = Object.create(DataChannelCertifierWorker.prototype);
      worker.env = mockEnv;

      const result = await worker.verifyBulkCompliance();

      // Should validate the enabled channel returned by registrar
      expect(mockEnv.DATA_CHANNEL_REGISTRAR.listAll).toHaveBeenCalledWith('default', true);
      expect(result.totalChannels).toBe(1);
    });
  });
});
