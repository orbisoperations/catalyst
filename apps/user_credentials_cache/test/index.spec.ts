import { env, runInDurableObject } from 'cloudflare:test';
import { afterAll, describe, expect, it } from 'vitest';
import { User } from '../../../packages/schema_zod/types';
import { UserCredsCache } from '../src';


describe('UserCredsCacheWorker', () => {
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

    it('should fail to get user from cache', async () => {
      // get the cache RPC stub
			const id = env.CACHE.idFromName('default');
			const stub = env.CACHE.get(id);

			const user = await stub.getUser('test-token');

      // use had not been created
      expect(user).toBeUndefined();
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
});
