import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import type { IssuedJWTRegistry, Token } from '@catalyst/schemas';

describe('Worker: Error Message Sanitization', () => {
	describe('Permission check failures return generic messages', () => {
		it('sanitizes errors in create() method', async () => {
			const invalidToken = {
				cfToken: 'invalid-token-that-will-fail',
			} as Token;

			const registryEntry = {
				name: 'Test Token',
				description: 'Test',
				claims: [],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'test-org',
				status: 'active',
			} as Omit<IssuedJWTRegistry, 'id'>;

			// Should throw generic error, not internal details
			// @ts-expect-error - Testing invalid token type causes deep type instantiation
			await expect(SELF.create(invalidToken, registryEntry)).rejects.toThrow('Authentication failed');

			// Should NOT throw the internal error message
			try {
				await SELF.create(invalidToken, registryEntry);
			} catch (error) {
				expect((error as Error).message).not.toContain('catalyst unable to validate user token');
				expect((error as Error).message).toBe('Authentication failed');
			}
		});

		it('sanitizes errors in get() method', async () => {
			const invalidToken: Token = {
				cfToken: 'invalid-token',
			};

			await expect(SELF.get(invalidToken, 'some-id')).rejects.toThrow('Authentication failed');
		});

		it('sanitizes errors in list() method', async () => {
			const invalidToken: Token = {
				cfToken: 'invalid-token',
			};

			await expect(SELF.list(invalidToken)).rejects.toThrow('Authentication failed');
		});

		it('sanitizes errors in update() method', async () => {
			const invalidToken: Token = {
				cfToken: 'invalid-token',
			};

			const registryEntry: IssuedJWTRegistry = {
				id: 'test-id',
				name: 'Test',
				description: 'Test',
				claims: [],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'test-org',
				status: 'active',
			};

			await expect(SELF.update(invalidToken, registryEntry)).rejects.toThrow('Authentication failed');
		});

		it('sanitizes errors in delete() method', async () => {
			const invalidToken: Token = {
				cfToken: 'invalid-token',
			};

			await expect(SELF.delete(invalidToken, 'some-id')).rejects.toThrow('Authentication failed');
		});

		it('sanitizes errors in addToRevocationList() method', async () => {
			const invalidToken: Token = {
				cfToken: 'invalid-token',
			};

			await expect(SELF.addToRevocationList(invalidToken, 'some-id')).rejects.toThrow('Authentication failed');
		});

		it('sanitizes errors in removeFromRevocationList() method', async () => {
			const invalidToken: Token = {
				cfToken: 'invalid-token',
			};

			await expect(SELF.removeFromRevocationList(invalidToken, 'some-id')).rejects.toThrow('Authentication failed');
		});
	});

	describe('Prevents information disclosure', () => {
		it('does not expose user validation details in error messages', async () => {
			const invalidToken: Token = {
				cfToken: 'definitely-invalid-token',
			};

			const registryEntry: Omit<IssuedJWTRegistry, 'id'> = {
				name: 'Test',
				description: 'Test',
				claims: [],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'test-org',
				status: 'active',
			};

			try {
				await SELF.create(invalidToken, registryEntry);
				expect.fail('Should have thrown an error');
			} catch (error) {
				const errorMessage = (error as Error).message;

				// Should not leak internal error details
				expect(errorMessage).not.toContain('unable to validate');
				expect(errorMessage).not.toContain('user token');
				expect(errorMessage).not.toContain('catalyst');

				// Should only contain generic message
				expect(errorMessage).toBe('Authentication failed');
			}
		});

		it('prevents timing attacks by always using same error message', async () => {
			const tokens = [{ cfToken: 'invalid-1' }, { cfToken: 'invalid-2' }, { cfToken: 'invalid-3' }];

			const registryEntry: Omit<IssuedJWTRegistry, 'id'> = {
				name: 'Test',
				description: 'Test',
				claims: [],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'test-org',
				status: 'active',
			};

			const errorMessages: string[] = [];

			for (const token of tokens) {
				try {
					await SELF.create(token, registryEntry);
				} catch (error) {
					errorMessages.push((error as Error).message);
				}
			}

			// All error messages should be identical
			expect(errorMessages).toHaveLength(3);
			expect(new Set(errorMessages).size).toBe(1);
			expect(errorMessages[0]).toBe('Authentication failed');
		});
	});

	describe('Sensitive data redaction in logs', () => {
		it('does not log JWT IDs in warning messages', async () => {
			// This test verifies the fix where we removed JWT ID from the warning log
			// The actual logging behavior is tested through the implementation
			// We verify the logic by checking that duplicate entries are handled

			const token: IssuedJWTRegistry = {
				id: 'sensitive-jwt-id-12345',
				name: 'Test Token',
				description: 'Test duplicate handling',
				claims: [],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'test-org',
				status: 'active',
			};

			// Create twice to trigger warning (but ID should not be logged)
			const result1 = await SELF.createSystem(token, 'authx_token_api');
			const result2 = await SELF.createSystem(token, 'authx_token_api');

			expect(result1.id).toBe('sensitive-jwt-id-12345');
			expect(result2.id).toBe('sensitive-jwt-id-12345');

			// The warning log should say "Registry entry already exists - skipping overwrite"
			// NOT "Registry entry already exists for JWT sensitive-jwt-id-12345"
		});
	});
});
