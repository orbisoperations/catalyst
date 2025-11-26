import { env, runInDurableObject } from 'cloudflare:test';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { User } from '@catalyst/schemas';

import { UserCredsCache, getOrgFromRoles } from '../src';

// Mock environment variables needed for validateUser tests
// Removed unused env variable stubs

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

		await runInDurableObject(stub, async (instance: UserCredsCache /* state: DurableObjectState */) => {
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

		await runInDurableObject(stub, async (instance: UserCredsCache /* state: DurableObjectState */) => {
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

	// Add tests for validateUser method
	describe('validateUser', () => {
		it('should return user data for a valid token', async () => {
			const id = env.CACHE.idFromName('default');
			const stub = env.CACHE.get(id);

			// Mock fetch to return the JSON data directly
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockCfAccessResponse,
			});
			const originalFetch = globalThis.fetch;
			globalThis.fetch = mockFetch;

			let user: User | undefined;
			try {
				// Call the method via the stub
				user = await stub.validateUser('valid-token');
			} finally {
				// Restore original fetch
				globalThis.fetch = originalFetch;
			}

			expect(user).toEqual(mockUser);
			// Check the identity endpoint path (URL may vary based on env.IDENTITY_ENDPOINT)
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/cdn-cgi/access/get-identity'),
				expect.objectContaining({
					headers: expect.objectContaining({
						cookie: `CF_Authorization=valid-token`,
					}),
				}),
			);
		});

		it('should return undefined for an invalid token (missing roles)', async () => {
			const id = env.CACHE.idFromName('default');
			const stub = env.CACHE.get(id);

			// Mock fetch to return invalid JSON data directly
			const invalidResponse = { ...mockCfAccessResponse, custom: {} };
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => invalidResponse,
			});
			const originalFetch = globalThis.fetch;
			globalThis.fetch = mockFetch;

			let user: User | undefined;
			try {
				// Call the method via the stub
				user = await stub.validateUser('invalid-token-roles');
			} finally {
				// Restore original fetch
				globalThis.fetch = originalFetch;
			}

			expect(user).toBeUndefined();
			expect(mockFetch).toHaveBeenCalledTimes(1);
			// Check the identity endpoint path (URL may vary based on env.IDENTITY_ENDPOINT)
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/cdn-cgi/access/get-identity'),
				expect.objectContaining({
					headers: expect.objectContaining({
						cookie: `CF_Authorization=invalid-token-roles`,
					}),
				}),
			);
		});

		it('should return undefined if fetch fails', async () => {
			const id = env.CACHE.idFromName('default');
			const stub = env.CACHE.get(id);

			// Mock fetch to return !ok status
			const mockFetch = vi.fn().mockResolvedValue({ ok: false });
			const originalFetch = globalThis.fetch;
			globalThis.fetch = mockFetch;

			let user: User | undefined;
			try {
				// Call the method via the stub
				user = await stub.validateUser('token-fetch-fails');
			} catch {
				// Expect validateUser to handle the fetch error and return undefined
				// If it throws, this catch block handles it, and user remains undefined.
			} finally {
				// Restore original fetch
				globalThis.fetch = originalFetch;
			}

			expect(user).toBeUndefined();
			expect(mockFetch).toHaveBeenCalledTimes(1);
			// Check the identity endpoint path (URL may vary based on env.IDENTITY_ENDPOINT)
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/cdn-cgi/access/get-identity'),
				expect.objectContaining({
					headers: expect.objectContaining({
						cookie: `CF_Authorization=token-fetch-fails`,
					}),
				}),
			);
		});

		it('should return undefined if Zod parsing fails', async () => {
			const id = env.CACHE.idFromName('default');
			const stub = env.CACHE.get(id);

			// Mock CF Access response to provide data that will fail Zod parsing (e.g., userId is not a string)
			const mockCfAccessResponseWithBadDataForZod = {
				...mockCfAccessResponse,
				email: 12345, // Non-string email to make User.userId fail parsing
			};

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockCfAccessResponseWithBadDataForZod,
			});
			const originalFetch = globalThis.fetch;
			globalThis.fetch = mockFetch;

			let user: User | undefined;
			try {
				user = await stub.validateUser('token-zod-fail');
			} finally {
				globalThis.fetch = originalFetch;
			}

			expect(user).toBeUndefined();
			expect(mockFetch).toHaveBeenCalledTimes(1);
			// Check the identity endpoint path (URL may vary based on env.IDENTITY_ENDPOINT)
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/cdn-cgi/access/get-identity'),
				expect.objectContaining({
					headers: expect.objectContaining({
						cookie: `CF_Authorization=token-zod-fail`,
					}),
				}),
			);
		});

		it('should return undefined if email (user) is missing from CF Access response', async () => {
			const id = env.CACHE.idFromName('default');
			const stub = env.CACHE.get(id);

			// Mock CF Access response with missing email
			const mockCfAccessResponseMissingEmail = {
				...mockCfAccessResponse,
				// Intentionally remove email property
				email: undefined,
			};
			delete mockCfAccessResponseMissingEmail.email;

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockCfAccessResponseMissingEmail,
			});
			const originalFetch = globalThis.fetch;
			globalThis.fetch = mockFetch;

			let user: User | undefined;
			try {
				user = await stub.validateUser('token-missing-email');
			} finally {
				globalThis.fetch = originalFetch;
			}

			expect(user).toBeUndefined();
			expect(mockFetch).toHaveBeenCalledTimes(1);
			// Check the identity endpoint path (URL may vary based on env.IDENTITY_ENDPOINT)
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/cdn-cgi/access/get-identity'),
				expect.objectContaining({
					headers: expect.objectContaining({
						cookie: `CF_Authorization=token-missing-email`,
					}),
				}),
			);
		});
	});
});
