import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JWT } from '../../src/jwt';
import { JWTRegisterStatus, ServiceUnavailableError } from '../../../../packages/schemas';
import type { Env } from '../../src/env';

type MockEnv = Pick<Env, 'ISSUED_JWT_REGISTRY' | 'KEY_PROVIDER' | 'AUTHZED' | 'USERCACHE' | 'DATA_CHANNEL_REGISTRAR'>;

type MockRegistry = {
	createSystem: ReturnType<typeof vi.fn>;
};

describe('JWTWorker._registerToken()', () => {
	let mockEnv: MockEnv;
	let mockRegistry: MockRegistry;

	beforeEach(() => {
		mockRegistry = {
			createSystem: vi.fn().mockResolvedValue({ id: 'test-jti' }),
		};

		mockEnv = {
			ISSUED_JWT_REGISTRY: mockRegistry,
			KEY_PROVIDER: {},
			AUTHZED: {},
			USERCACHE: {},
			DATA_CHANNEL_REGISTRAR: {},
		};
	});

	it('should register token with jwt.jti as id', async () => {
		const jwt = new JWT('user@example.com', ['urn:catalyst:datachannel:test:channel1'], 'test-issuer');
		jwt.exp = Math.floor(Date.now() / 1000) + 3600; // Set expiration to 1 hour from now

		// Access the private method through dynamic property access for testing
		const JWTWorker = (await import('../../src/index')).default;
		const worker = new JWTWorker({} as ExecutionContext, mockEnv);
		const registerToken = (
			worker as unknown as { _registerToken: (jwt: JWT, name: string, desc: string, org: string) => Promise<void> }
		)._registerToken.bind(worker);

		await registerToken(jwt, 'Test Token', 'Test Description', 'test-org');

		expect(mockRegistry.createSystem).toHaveBeenCalledWith(
			expect.objectContaining({
				id: jwt.jti,
				name: 'Test Token',
				description: 'Test Description',
				claims: jwt.claims,
				organization: 'test-org',
				status: JWTRegisterStatus.enum.active,
			}),
			'authx_token_api',
			'default',
		);
	});

	it('should throw ServiceUnavailableError when registry fails', async () => {
		mockRegistry.createSystem = vi.fn().mockRejectedValue(new Error('Network error'));

		const jwt = new JWT('user@example.com', ['urn:catalyst:datachannel:test:channel1'], 'test-issuer');
		jwt.exp = Math.floor(Date.now() / 1000) + 3600;

		const JWTWorker = (await import('../../src/index')).default;
		const worker = new JWTWorker({} as ExecutionContext, mockEnv);
		const registerToken = (
			worker as unknown as { _registerToken: (jwt: JWT, name: string, desc: string, org: string) => Promise<void> }
		)._registerToken.bind(worker);

		await expect(registerToken(jwt, 'Test', 'Test', 'org')).rejects.toThrow(ServiceUnavailableError);

		await expect(registerToken(jwt, 'Test', 'Test', 'org')).rejects.toThrow("Service 'ISSUED_JWT_REGISTRY' is currently unavailable");
	});

	it('should convert JWT exp (seconds) to Date (milliseconds)', async () => {
		const jwt = new JWT('user@example.com', ['urn:catalyst:datachannel:test:channel1'], 'test-issuer');
		jwt.exp = 1704153600; // Unix timestamp in seconds

		const JWTWorker = (await import('../../src/index')).default;
		const worker = new JWTWorker({} as ExecutionContext, mockEnv);
		const registerToken = (
			worker as unknown as { _registerToken: (jwt: JWT, name: string, desc: string, org: string) => Promise<void> }
		)._registerToken.bind(worker);

		await registerToken(jwt, 'Test', 'Test', 'org');

		const callArgs = mockRegistry.createSystem.mock.calls[0][0];
		expect(callArgs.expiry).toBeInstanceOf(Date);
		expect(callArgs.expiry.getTime()).toBe(1704153600 * 1000);
	});
});
