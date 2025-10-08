import { describe, it, expect } from 'vitest';
import { JWTRegisterStatus } from '../../../../packages/schemas';
import type { IssuedJWTRegistry } from '../../../../packages/schemas';

type MockStorage = {
	get: (key: string) => Promise<IssuedJWTRegistry | undefined>;
	put: (key: string, value: IssuedJWTRegistry) => Promise<undefined>;
};

type MockContext = {
	storage: MockStorage;
	blockConcurrencyWhile: (fn: () => Promise<void>) => Promise<void>;
};

describe('I_JWT_Registry_DO.delete()', () => {
	it('should throw "Token already deleted" when deleting already-deleted token', async () => {
		const { I_JWT_Registry_DO } = await import('../../src/index');

		// Create a mock storage with an already-deleted token
		const mockStorage = new Map();
		const deletedToken = {
			id: 'test-token-id',
			name: 'Test Token',
			description: 'Already deleted',
			claims: ['test:claim'],
			expiry: new Date(Date.now() + 3600000),
			organization: 'test-org',
			status: JWTRegisterStatus.enum.deleted,
		};
		mockStorage.set('test-token-id', deletedToken);

		const mockCtx: MockContext = {
			storage: {
				get: async (key: string) => mockStorage.get(key),
				put: async (key: string, value: IssuedJWTRegistry) => {
					mockStorage.set(key, value);
					return undefined;
				},
			},
			blockConcurrencyWhile: async (fn: () => Promise<void>) => await fn(),
		};

		const durableObject = new I_JWT_Registry_DO(mockCtx as unknown as DurableObjectState, {} as Record<string, never>);

		await expect(durableObject.delete('test-token-id')).rejects.toThrow('Token already deleted');
	});

	it('should throw "Token not found" for non-existent ID', async () => {
		const { I_JWT_Registry_DO } = await import('../../src/index');

		const mockStorage = new Map();

		const mockCtx: MockContext = {
			storage: {
				get: async (key: string) => mockStorage.get(key),
				put: async (key: string, value: IssuedJWTRegistry) => {
					mockStorage.set(key, value);
					return undefined;
				},
			},
			blockConcurrencyWhile: async (fn: () => Promise<void>) => await fn(),
		};

		const durableObject = new I_JWT_Registry_DO(mockCtx as unknown as DurableObjectState, {} as Record<string, never>);

		await expect(durableObject.delete('non-existent-id')).rejects.toThrow('Token not found');
	});

	it('should succeed for first deletion attempt', async () => {
		const { I_JWT_Registry_DO } = await import('../../src/index');

		const mockStorage = new Map();
		const activeToken = {
			id: 'test-token-id',
			name: 'Test Token',
			description: 'Active token',
			claims: ['test:claim'],
			expiry: new Date(Date.now() + 3600000),
			organization: 'test-org',
			status: JWTRegisterStatus.enum.active,
		};
		mockStorage.set('test-token-id', activeToken);

		const mockCtx: MockContext = {
			storage: {
				get: async (key: string) => mockStorage.get(key),
				put: async (key: string, value: IssuedJWTRegistry) => {
					mockStorage.set(key, value);
					return undefined;
				},
			},
			blockConcurrencyWhile: async (fn: () => Promise<void>) => await fn(),
		};

		const durableObject = new I_JWT_Registry_DO(mockCtx as unknown as DurableObjectState, {} as Record<string, never>);

		// Should not throw
		await durableObject.delete('test-token-id');

		// Verify the token was marked as deleted
		const updatedToken = mockStorage.get('test-token-id');
		expect(updatedToken.status).toBe(JWTRegisterStatus.enum.deleted);
	});
});
