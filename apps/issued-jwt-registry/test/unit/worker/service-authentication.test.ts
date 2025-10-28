import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import type { IssuedJWTRegistry } from '@catalyst/schemas';

describe('Worker: Service Authentication in createSystem()', () => {
	describe('Authorized service access', () => {
		it('allows authx_token_api to create system tokens', async () => {
			const systemToken: IssuedJWTRegistry = {
				id: crypto.randomUUID(),
				name: 'System Token from authx_token_api',
				description: 'Created by authorized service',
				claims: ['service:token'],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'system',
				status: 'active',
			};

			// Should succeed
			const result = await SELF.createSystem(systemToken, 'authx_token_api');
			expect(result.id).toBe(systemToken.id);
		});

		it('allows data_channel_certifier to create system tokens', async () => {
			const systemToken: IssuedJWTRegistry = {
				id: crypto.randomUUID(),
				name: 'System Token from certifier',
				description: 'Created by authorized service',
				claims: ['certify:channel'],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'certifier-org',
				status: 'active',
			};

			// Should succeed
			const result = await SELF.createSystem(systemToken, 'data_channel_certifier');
			expect(result.id).toBe(systemToken.id);
		});
	});

	describe('Unauthorized service rejection', () => {
		it('rejects unauthorized service names', async () => {
			const systemToken: IssuedJWTRegistry = {
				id: crypto.randomUUID(),
				name: 'Malicious Token',
				description: 'Attempted by unauthorized service',
				claims: ['admin:all'],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'system',
				status: 'active',
			};

			// Should reject
			await expect(SELF.createSystem(systemToken, 'malicious_service')).rejects.toThrow('Unauthorized service');
		});

		it('rejects empty service names', async () => {
			const systemToken: IssuedJWTRegistry = {
				id: crypto.randomUUID(),
				name: 'Token with empty service',
				description: 'No service name provided',
				claims: [],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'test-org',
				status: 'active',
			};

			// Should reject
			await expect(SELF.createSystem(systemToken, '')).rejects.toThrow('Unauthorized service');
		});

		it('rejects attempts to spoof authorized service names with whitespace', async () => {
			const systemToken: IssuedJWTRegistry = {
				id: crypto.randomUUID(),
				name: 'Whitespace Spoof Token',
				description: 'Attempted whitespace attack',
				claims: [],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'test-org',
				status: 'active',
			};

			// Should reject (exact match required)
			await expect(SELF.createSystem(systemToken, ' authx_token_api ')).rejects.toThrow('Unauthorized service');
		});

		it('rejects case variations of authorized service names', async () => {
			const systemToken: IssuedJWTRegistry = {
				id: crypto.randomUUID(),
				name: 'Case Spoof Token',
				description: 'Attempted case variation attack',
				claims: [],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'test-org',
				status: 'active',
			};

			// Should reject (case-sensitive match required)
			await expect(SELF.createSystem(systemToken, 'AUTHX_TOKEN_API')).rejects.toThrow('Unauthorized service');

			await expect(SELF.createSystem(systemToken, 'Authx_Token_Api')).rejects.toThrow('Unauthorized service');
		});
	});

	describe('Input validation in createSystem()', () => {
		it('validates registry entry schema using Zod', async () => {
			const invalidToken: Partial<IssuedJWTRegistry> = {
				id: 'test-id',
				name: 'Invalid Token',
				// Missing required fields
			};

			// Should reject due to schema validation
			await expect(SELF.createSystem(invalidToken as unknown as IssuedJWTRegistry, 'authx_token_api')).rejects.toThrow(
				'Invalid registry entry',
			);
		});

		it('rejects tokens with invalid status values', async () => {
			const invalidToken = {
				id: crypto.randomUUID(),
				name: 'Invalid Status',
				description: 'Test',
				claims: [],
				expiry: new Date(Date.now() + 1000 * 60 * 60),
				organization: 'test-org',
				status: 'invalid-status' as const,
			};

			// Should reject due to invalid enum value
			await expect(SELF.createSystem(invalidToken as unknown as IssuedJWTRegistry, 'authx_token_api')).rejects.toThrow(
				'Invalid registry entry',
			);
		});

		it('rejects tokens with invalid expiry dates', async () => {
			const invalidToken = {
				id: crypto.randomUUID(),
				name: 'Invalid Expiry',
				description: 'Test',
				claims: [],
				expiry: 'not-a-date' as unknown as Date,
				organization: 'test-org',
				status: 'active' as const,
			};

			// Should reject due to invalid date type
			await expect(SELF.createSystem(invalidToken as unknown as IssuedJWTRegistry, 'authx_token_api')).rejects.toThrow(
				'Invalid registry entry',
			);
		});
	});

	describe('Defense in depth - dual validation', () => {
		it('validates at Worker level before passing to Durable Object', async () => {
			const invalidToken: Partial<IssuedJWTRegistry> = {
				id: 'test-id',
				// Incomplete data
			};

			// Worker-level validation should catch this first
			await expect(SELF.createSystem(invalidToken as unknown as IssuedJWTRegistry, 'authx_token_api')).rejects.toThrow(
				'Invalid registry entry',
			);

			// Durable Object should never receive this invalid data
		});

		it('prevents privilege escalation via service impersonation', async () => {
			const escalationToken: IssuedJWTRegistry = {
				id: crypto.randomUUID(),
				name: 'Privilege Escalation Attempt',
				description: 'Trying to create admin token',
				claims: ['admin:*', 'system:root'],
				expiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
				organization: 'system',
				status: 'active',
			};

			// Should be rejected if service is not authorized
			await expect(SELF.createSystem(escalationToken, 'random_service')).rejects.toThrow('Unauthorized service');
		});
	});
});
