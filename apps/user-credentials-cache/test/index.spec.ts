import { env, runInDurableObject } from 'cloudflare:test';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { User } from '../../../packages/schema_zod/types';

import { UserCredsCache, getOrgFromRoles } from '../src';


// Mock data for testing
const mockUser: User = {
	userId: 'test-user-id',
	orgId: 'test-org-id',
	zitadelRoles: ['platform-admin', 'org-admin', 'org-user', 'data-custodian'],
};

// Mock response for Cloudflare Access
const mockCfAccessResponse = {
	email: 'test-user-id',
	custom: {
		'urn:zitadel:iam:org:project:roles': {
			'platform-admin': { 'test-org-id': 'test-org-id.domain' },
			'org-admin': { 'test-org-id': 'test-org-id.domain' },
			'org-user': { 'test-org-id': 'test-org-id.domain' },
			'data-custodian': { 'test-org-id': 'test-org-id.domain' },
		},
	},
};

describe('UserCredsCacheWorker', () => {
  describe('getOrgFromRoles', () => {
		it('should extract org and roles from valid roles object', () => {
			const roles = mockCfAccessResponse.custom['urn:zitadel:iam:org:project:roles'];
			const result = getOrgFromRoles(roles);
			expect(result).toEqual({
				org: 'test-org-id',
				roles: ['platform-admin', 'org-admin', 'org-user', 'data-custodian'],
			});
		});

		it('should return undefined for invalid roles object', () => {
			const invalidRoles = {
				'invalid-role': { 'test-org-id': 'test-org-id.domain' },
			};
			const result = getOrgFromRoles(invalidRoles);
			expect(result).toBeUndefined();
		});
	});


	describe('getUser', () => {
    afterAll(async () => {
      // delete the cache
      const id = env.CACHE.idFromName('default');
      const stub = env.CACHE.get(id);
      // run the test in the durable object
      // clear the cache
      await runInDurableObject(stub, async (instance: UserCredsCache, state: DurableObjectState) => {
        expect(instance).toBeInstanceOf(UserCredsCache);
        await state.storage.deleteAll();
      });
    });

    it('should return user from cache when exists', async () => {
      // get the cache RPC stub
			const id = env.CACHE.idFromName('default');
			const stub = env.CACHE.get(id);

      // run the test in the durable object
      // save a dummy user in the cache
      await runInDurableObject(stub, async (instance: UserCredsCache, state: DurableObjectState) => {
        expect(instance).toBeInstanceOf(UserCredsCache);
        await state.storage.put('cached-token', mockUser);
        // Mock validateUser to ensure it's not called
				instance.validateUser = vi.fn().mockRejectedValue(new Error('Should not be called'));

      });

			const user = await stub.getUser('cached-token');

      // use had not been created
      expect(user).toEqual(mockUser);
		});

		it('should get user from cache', async () => {
      // data to be stored in the cache
			const testData: User = {
				userId: 'test-user-id',
				orgId: 'test-org-id',
				zitadelRoles: ['platform-admin', 'org-admin', 'org-user', 'data-custodian'],
			};

      // get the cache RPC stub
			const id = env.CACHE.idFromName('default');
			const stub = env.CACHE.get(id);

      // run the test in the durable object
      // save a dummy user in the cache
      await runInDurableObject(stub, async (instance: UserCredsCache, state: DurableObjectState) => {
        expect(instance).toBeInstanceOf(UserCredsCache);
        // put the data into the cache
        await state.storage.put('test-token', testData);
      });

      // get the data from the cache with main logic
			const user = await stub.getUser('test-token');
			console.log('user from cache:', user);
      expect(user).toEqual(testData);
		});
	});
  it('should validate and cache user on cache miss', async () => {
    const id = env.CACHE.idFromName('default');
    const stub = env.CACHE.get(id);
    const validateUserSpy = vi.fn().mockResolvedValue(mockUser);


  await runInDurableObject(stub, async (instance: UserCredsCache, state: DurableObjectState) => {
      expect(instance).toBeInstanceOf(UserCredsCache);
      instance.validateUser = validateUserSpy;
    });

    const user = await stub.getUser('new-token');
    expect(user).toEqual(mockUser);
    expect(validateUserSpy).toHaveBeenCalledWith('new-token');

    // Verify user was cached
    await runInDurableObject(stub, async (instance: UserCredsCache, state: DurableObjectState) => {
      const cachedUser = await state.storage.get('new-token');
      expect(cachedUser).toEqual(mockUser);
    });
  });

  it('should return undefined when validation fails', async () => {
    const id = env.CACHE.idFromName('default');
    const stub = env.CACHE.get(id);
    const validateUserSpy = vi.fn().mockResolvedValue(undefined);

    await runInDurableObject(stub, async (instance: UserCredsCache, state: DurableObjectState) => {
      expect(instance).toBeInstanceOf(UserCredsCache);
      instance.validateUser = validateUserSpy;
    });

    const user = await stub.getUser('invalid-token');
    expect(user).toBeUndefined();
    expect(validateUserSpy).toHaveBeenCalledWith('invalid-token');
  });

describe('purge', () => {
  it('should remove old tokens for same user', async () => {
    const id = env.CACHE.idFromName('default');
    const stub = env.CACHE.get(id);

    await runInDurableObject(stub, async (instance: UserCredsCache, state: DurableObjectState) => {
      // Setup multiple tokens for same user
      await state.storage.put('old-token-1', mockUser);
      await state.storage.put('old-token-2', mockUser);
      await state.storage.put('current-token', mockUser);

      // Different user's token should not be purged
      const differentUser = { ...mockUser, userId: 'different-user' };
      await state.storage.put('different-user-token', differentUser);

      // Trigger purge
      await instance.purge('current-token', mockUser);

      // Verify old tokens are removed
      const oldToken1 = await state.storage.get('old-token-1');
      const oldToken2 = await state.storage.get('old-token-2');
      expect(oldToken1).toBeUndefined();
      expect(oldToken2).toBeUndefined();

      // Verify current token and different user's token remain
      const currentToken = await state.storage.get('current-token');
      const differentToken = await state.storage.get('different-user-token');
      expect(currentToken).toEqual(mockUser);
      expect(differentToken).toEqual(differentUser);
    });
  });
});

});