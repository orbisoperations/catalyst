import { DataChannel } from '@catalyst/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegistrarWorker from '../../src/worker';

describe('RegistrarWorker listAll - Unit Tests', () => {
  let mockEnv: {
    DO: { idFromName: (name: string) => string; get: (id: string) => typeof mockStub };
    AUTHZED: unknown;
    USERCACHE: unknown;
  };
  let mockDO: { idFromName: (name: string) => string; get: (id: string) => typeof mockStub };
  let mockStub: { list: ReturnType<typeof vi.fn> } & Record<string, unknown>;

  const mockChannels: DataChannel[] = [
    {
      id: 'channel-1',
      name: 'Test Channel 1',
      description: 'Active channel',
      endpoint: 'https://example1.com/graphql',
      creatorOrganization: 'test-org-1',
      accessSwitch: true,
    },
    {
      id: 'channel-2',
      name: 'Test Channel 2',
      description: 'Another active channel',
      endpoint: 'https://example2.com/graphql',
      creatorOrganization: 'test-org-2',
      accessSwitch: true,
    },
    {
      id: 'channel-3',
      name: 'Test Channel 3',
      description: 'Disabled channel',
      endpoint: 'https://example3.com/graphql',
      creatorOrganization: 'test-org-1',
      accessSwitch: false,
    },
  ];

  beforeEach(() => {
    // Mock the Durable Object stub
    mockStub = {
      list: vi.fn(),
    } as { list: ReturnType<typeof vi.fn> } & Record<string, unknown>;

    // Mock the Durable Object namespace
    mockDO = {
      idFromName: vi.fn().mockReturnValue('mock-do-id'),
      get: vi.fn().mockReturnValue(mockStub),
    } as { idFromName: (name: string) => string; get: (id: string) => typeof mockStub };

    // Mock the environment
    mockEnv = {
      DO: mockDO,
      AUTHZED: {},
      USERCACHE: {},
    };
  });

  describe('listAll method', () => {
    it('should return an empty array when no channels exist', async () => {
      mockStub.list.mockResolvedValue([]);

      const worker = Object.create(RegistrarWorker.prototype) as RegistrarWorker & {
        env: typeof mockEnv;
      };
      worker.env = mockEnv;

      const result = await worker.listAll();

      expect(mockDO.idFromName).toHaveBeenCalledWith('default');
      expect(mockDO.get).toHaveBeenCalledWith('mock-do-id');
      expect(mockStub.list).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return all channels without any filtering', async () => {
      mockStub.list.mockResolvedValue(mockChannels);

      const worker = Object.create(RegistrarWorker.prototype) as RegistrarWorker & {
        env: typeof mockEnv;
      };
      worker.env = mockEnv;

      const result = await worker.listAll();

      expect(mockStub.list).toHaveBeenCalled();
      expect(result).toEqual(mockChannels);
      expect(result).toHaveLength(3);
    });

    it('should use the provided namespace', async () => {
      mockStub.list.mockResolvedValue([]);

      const worker = Object.create(RegistrarWorker.prototype) as RegistrarWorker & {
        env: typeof mockEnv;
      };
      worker.env = mockEnv;

      await worker.listAll('custom-namespace');

      expect(mockDO.idFromName).toHaveBeenCalledWith('custom-namespace');
    });

    it('should use default namespace when not provided', async () => {
      mockStub.list.mockResolvedValue([]);

      const worker = Object.create(RegistrarWorker.prototype) as RegistrarWorker & {
        env: typeof mockEnv;
      };
      worker.env = mockEnv;

      await worker.listAll();

      expect(mockDO.idFromName).toHaveBeenCalledWith('default');
    });

    it('should return channels with both enabled and disabled accessSwitch', async () => {
      mockStub.list.mockResolvedValue(mockChannels);

      const worker = Object.create(RegistrarWorker.prototype) as RegistrarWorker & {
        env: typeof mockEnv;
      };
      worker.env = mockEnv;

      const result = await worker.listAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(3);

      const enabledChannels = result!.filter(ch => ch.accessSwitch === true);
      const disabledChannels = result!.filter(ch => ch.accessSwitch === false);

      expect(enabledChannels).toHaveLength(2);
      expect(disabledChannels).toHaveLength(1);
    });

    it('should return null when an error occurs', async () => {
      mockStub.list.mockRejectedValue(new Error('DO error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const worker = Object.create(RegistrarWorker.prototype) as RegistrarWorker & {
        env: typeof mockEnv;
      };
      worker.env = mockEnv;

      const result = await worker.listAll();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[RegistrarWorker] Error listing all channels:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should not perform any permission checks', async () => {
      mockStub.list.mockResolvedValue(mockChannels);

      const worker = Object.create(RegistrarWorker.prototype) as RegistrarWorker & {
        env: typeof mockEnv;
      };
      worker.env = mockEnv;

      // Spy on the permission methods
      const rPermsSpy = vi.spyOn(worker, 'RPerms');
      const cudPermsSpy = vi.spyOn(worker, 'CUDPerms');

      const result = await worker.listAll();

      // Verify that no permission methods were called
      expect(rPermsSpy).not.toHaveBeenCalled();
      expect(cudPermsSpy).not.toHaveBeenCalled();

      // All channels should be returned
      expect(result).toHaveLength(3);
    });

    it('should pass filter flag to DO and return only enabled channels when requested', async () => {
      // When list is called with true, it should return only enabled channels
      const enabledChannelsOnly = [
        {
          id: 'a',
          name: 'A',
          description: '',
          endpoint: '',
          creatorOrganization: 'o1',
          accessSwitch: true,
        } as DataChannel,
        {
          id: 'c',
          name: 'C',
          description: '',
          endpoint: '',
          creatorOrganization: 'o2',
          accessSwitch: true,
        } as DataChannel,
      ];

      mockStub.list.mockResolvedValue(enabledChannelsOnly);

      const worker = Object.create(RegistrarWorker.prototype) as RegistrarWorker & {
        env: typeof mockEnv;
      };
      worker.env = mockEnv;

      const result = await worker.listAll('default', true);

      expect(mockDO.idFromName).toHaveBeenCalledWith('default');
      expect(mockDO.get).toHaveBeenCalledWith('mock-do-id');
      expect(mockStub.list).toHaveBeenCalledWith(true);
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result!.every(dc => dc.accessSwitch === true)).toBe(true);
    });
  });

  describe('listAll vs list comparison', () => {
    it('listAll does not use token while list does', async () => {
      // Setup for list method
      const mockUser = {
        userId: 'user-1',
        orgId: 'test-org-1',
        email: 'test@example.com',
        zitadelRoles: ['org-user'],
      };

      mockEnv.USERCACHE = {
        getUser: vi.fn().mockResolvedValue(mockUser),
      };

      mockEnv.AUTHZED = {
        canReadFromDataChannel: vi.fn().mockResolvedValue(true),
      };

      mockStub.list.mockResolvedValue(mockChannels);

      const worker = Object.create(RegistrarWorker.prototype) as RegistrarWorker & {
        env: typeof mockEnv;
      };
      worker.env = mockEnv;

      // Test listAll - no token needed
      const listAllResult = await worker.listAll();
      expect(listAllResult).toHaveLength(3);

      // Verify no user cache calls for listAll
      expect(
        (mockEnv.USERCACHE as { getUser: ReturnType<typeof vi.fn> }).getUser,
      ).not.toHaveBeenCalled();
    });
  });
});
