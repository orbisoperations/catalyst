import { SELF } from 'cloudflare:test';
import { createLocalJWKSet, decodeJwt, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';

/**
 * Integration Tests: System Service JWT Workflows
 *
 * These tests verify the complete workflow for system services
 * to obtain JWTs without user tokens. System services like
 * data-channel-certifier need JWTs to access channels for validation.
 *
 * This is separate from user JWT workflows and has different
 * authorization rules (service allowlist instead of user permissions).
 */
describe('Integration: System Service JWT Workflows', () => {
	const ALLOWED_SERVICES = ['data-channel-certifier', 'scheduled-validator'];

	describe('System JWT Creation and Validation', () => {
		it('should create and validate system JWT end-to-end for data-channel-certifier', async () => {
			const systemRequest = {
				callingService: 'data-channel-certifier',
				channelId: 'test-channel-123',
				purpose: 'channel-validation',
				duration: 300, // 5 minutes
			};

			const signResponse = await SELF.signSystemJWT(systemRequest, 'default');

			expect(signResponse.success).toBe(true);
			expect(signResponse.token).toBeDefined();
			expect(signResponse.expiration).toBeDefined();

			const token = signResponse.token!;

			const validateResponse = await SELF.validateToken(token, 'default');

			expect(validateResponse.valid).toBe(true);
			expect(validateResponse.entity).toBe('system-data-channel-certifier');
			expect(validateResponse.claims).toEqual(['test-channel-123']);
			expect(validateResponse.jwtId).toBeDefined();

			const publicKeyResponse = await SELF.getPublicKeyJWK('default');
			const jwks = createLocalJWKSet(publicKeyResponse);

			const { payload, protectedHeader } = await jwtVerify(token, jwks, {
				clockTolerance: '5 minutes',
			});

			expect(protectedHeader.alg).toBe('EdDSA');
			expect(payload.sub).toBe('system-data-channel-certifier');
			expect(payload.claims).toEqual(['test-channel-123']);
			expect(payload.iss).toBe('catalyst:system:jwt:latest');
			expect(payload.aud).toBe('catalyst:system');

			const expiryDuration = (payload.exp as number) - (payload.iat as number);
			// Allow 5 second tolerance
			expect(expiryDuration).toBeGreaterThanOrEqual(295);
			expect(expiryDuration).toBeLessThanOrEqual(305);
		});

		it('should create system JWT for multiple channels', async () => {
			const channelIds = ['channel-1', 'channel-2', 'channel-3', 'channel-4'];

			const systemRequest = {
				callingService: 'scheduled-validator',
				channelIds: channelIds,
				purpose: 'bulk-validation',
				duration: 600, // 10 minutes
			};

			const signResponse = await SELF.signSystemJWT(systemRequest, 'default');

			expect(signResponse.success).toBe(true);
			expect(signResponse.token).toBeDefined();

			const validateResponse = await SELF.validateToken(signResponse.token!, 'default');

			expect(validateResponse.valid).toBe(true);
			expect(validateResponse.entity).toBe('system-scheduled-validator');
			expect(validateResponse.claims).toHaveLength(4);
			expect(validateResponse.claims).toEqual(expect.arrayContaining(channelIds));

			// 10 minutes
			const decoded = decodeJwt(signResponse.token!);
			const expiryDuration = (decoded.exp as number) - (decoded.iat as number);
			expect(expiryDuration).toBeGreaterThanOrEqual(595);
			expect(expiryDuration).toBeLessThanOrEqual(605);
		});

		it('should respect system token duration limits and defaults', async () => {
			const channelId = 'test-channel';

			const defaultRequest = {
				callingService: 'data-channel-certifier',
				channelId: channelId,
				purpose: 'validation',
				// No duration specified
			};

			const defaultResponse = await SELF.signSystemJWT(defaultRequest, 'default');
			expect(defaultResponse.success).toBe(true);

			const defaultDecoded = decodeJwt(defaultResponse.token!);
			const defaultDuration = (defaultDecoded.exp as number) - (defaultDecoded.iat as number);
			expect(defaultDuration).toBeGreaterThanOrEqual(295);
			expect(defaultDuration).toBeLessThanOrEqual(305);

			const minRequest = {
				callingService: 'data-channel-certifier',
				channelId: channelId,
				purpose: 'validation',
				duration: 1,
			};

			const minResponse = await SELF.signSystemJWT(minRequest, 'default');
			expect(minResponse.success).toBe(true);

			const minDecoded = decodeJwt(minResponse.token!);
			const minDuration = (minDecoded.exp as number) - (minDecoded.iat as number);
			expect(minDuration).toBeLessThanOrEqual(5); // Very short

			const maxRequest = {
				callingService: 'data-channel-certifier',
				channelId: channelId,
				purpose: 'validation',
				duration: 3600, // 1 hour
			};

			const maxResponse = await SELF.signSystemJWT(maxRequest, 'default');
			expect(maxResponse.success).toBe(true);

			const maxDecoded = decodeJwt(maxResponse.token!);
			const maxDuration = (maxDecoded.exp as number) - (maxDecoded.iat as number);
			expect(maxDuration).toBeGreaterThanOrEqual(3595);
			expect(maxDuration).toBeLessThanOrEqual(3605);

			const exceedRequest = {
				callingService: 'data-channel-certifier',
				channelId: channelId,
				purpose: 'validation',
				duration: 7200, // 2 hours - exceeds max
			};

			const exceedResponse = await SELF.signSystemJWT(exceedRequest, 'default');
			expect(exceedResponse.success).toBe(false);
			expect(exceedResponse.error).toContain('duration exceeds maximum');
		});

		it('should verify system tokens work across namespaces independently', async () => {
			const channelId = 'test-channel';

			const systemRequest = {
				callingService: 'data-channel-certifier',
				channelId: channelId,
				purpose: 'validation',
				duration: 300,
			};

			const defaultResponse = await SELF.signSystemJWT(systemRequest, 'default');
			expect(defaultResponse.success).toBe(true);

			const tenant1Response = await SELF.signSystemJWT(systemRequest, 'tenant-1');
			expect(tenant1Response.success).toBe(true);

			expect(defaultResponse.token).not.toBe(tenant1Response.token);

			const defaultValidate = await SELF.validateToken(defaultResponse.token!, 'default');
			expect(defaultValidate.valid).toBe(true);

			const crossValidate = await SELF.validateToken(defaultResponse.token!, 'tenant-1');
			expect(crossValidate.valid).toBe(false);

			const tenant1Validate = await SELF.validateToken(tenant1Response.token!, 'tenant-1');
			expect(tenant1Validate.valid).toBe(true);
		});
	});

	describe('System JWT Authorization', () => {
		it('should allow all services in allowlist', async () => {
			for (const serviceName of ALLOWED_SERVICES) {
				const request = {
					callingService: serviceName,
					channelId: 'test-channel',
					purpose: 'validation',
					duration: 300,
				};

				const response = await SELF.signSystemJWT(request, 'default');

				expect(response.success).toBe(true);
				expect(response.token).toBeDefined();

				const validateResponse = await SELF.validateToken(response.token!, 'default');
				expect(validateResponse.entity).toBe(`system-${serviceName}`);
			}
		});

		it('should reject unauthorized system services', async () => {
			const unauthorizedServices = [
				'malicious-service',
				'random-service',
				'user-service',
				'data_channel_gateway', // Not in allowlist
			];

			for (const serviceName of unauthorizedServices) {
				const request = {
					callingService: serviceName,
					channelId: 'test-channel',
					purpose: 'validation',
					duration: 300,
				};

				const response = await SELF.signSystemJWT(request, 'default');

				expect(response.success).toBe(false);
				expect(response.error).toBeDefined();
				expect(response.error).toContain('not authorized');
				expect(response.token).toBeUndefined();
			}
		});

		it('should reject system JWT requests with invalid inputs', async () => {
			const emptyServiceResponse = await SELF.signSystemJWT(
				{
					callingService: '',
					channelId: 'test-channel',
					purpose: 'validation',
					duration: 300,
				},
				'default',
			);

			expect(emptyServiceResponse.success).toBe(false);
			expect(emptyServiceResponse.error).toContain('callingService is required');

			const emptyChannelResponse = await SELF.signSystemJWT(
				{
					callingService: 'data-channel-certifier',
					channelId: '',
					purpose: 'validation',
					duration: 300,
				},
				'default',
			);

			expect(emptyChannelResponse.success).toBe(false);
			expect(emptyChannelResponse.error).toContain('At least one channelId is required');

			const emptyArrayResponse = await SELF.signSystemJWT(
				{
					callingService: 'data-channel-certifier',
					channelIds: [],
					purpose: 'validation',
					duration: 300,
				},
				'default',
			);

			expect(emptyArrayResponse.success).toBe(false);
			expect(emptyArrayResponse.error).toContain('At least one channelId is required');

			const negativeDurationResponse = await SELF.signSystemJWT(
				{
					callingService: 'data-channel-certifier',
					channelId: 'test-channel',
					purpose: 'validation',
					duration: -100,
				},
				'default',
			);

			expect(negativeDurationResponse.success).toBe(false);
			expect(negativeDurationResponse.error).toContain('duration exceeds maximum');
		});
	});

	describe('System JWT vs User JWT Comparison', () => {
		it('should verify system JWTs have correct subject format', async () => {
			const systemRequest = {
				callingService: 'data-channel-certifier',
				channelId: 'test-channel',
				purpose: 'validation',
				duration: 300,
			};

			const systemResponse = await SELF.signSystemJWT(systemRequest, 'default');
			expect(systemResponse.success).toBe(true);

			const systemDecoded = decodeJwt(systemResponse.token!);

			expect(systemDecoded.sub).toBe('system-data-channel-certifier');
			expect(systemDecoded.sub).toMatch(/^system-/);

			expect(systemDecoded.iss).toBe('catalyst:system:jwt:latest');
			expect(systemDecoded.aud).toBe('catalyst:system');
		});
	});
});
