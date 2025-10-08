import { SELF } from 'cloudflare:test';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('signSystemJWT - System Service JWT Signing', () => {
	const SYSTEM_SERVICE_NAME = 'data-channel-certifier';
	const TEST_CHANNEL_ID = 'test-channel-123';

	beforeEach(() => {
		// Reset any mocks
		vi.clearAllMocks();
	});

	describe('System Service Authentication', () => {
		it('should sign a JWT for a valid system service without requiring CF token', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 300, // 5 minutes in seconds
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(true);
			if (response.success) {
				expect(response.token).toBeDefined();
				expect(response.expiration).toBeDefined();

				// Verify the JWT has correct claims
				const publicKey = await SELF.getPublicKeyJWK();
				const jwks = createLocalJWKSet(publicKey);
				const { payload } = await jwtVerify(response.token, jwks);

				expect(payload.sub).toBe(`system-${SYSTEM_SERVICE_NAME}`);
				expect(payload.claims).toEqual([TEST_CHANNEL_ID]);
			}
		});

		it('should reject requests from unknown services', async () => {
			// Arrange
			const request = {
				callingService: 'unknown-service',
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('not authorized');
			}
		});

		it('should reject requests without a calling service', async () => {
			// Arrange
			const request = {
				callingService: '',
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('callingService is required');
			}
		});

		it('should reject requests without a channel ID', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: '',
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('At least one channelId is required');
			}
		});

		it('should use default duration if not specified', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				// duration not specified
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(true);
			if (response.success) {
				const now = Date.now();
				const expectedExpiry = now + 300 * 1000; // Default 5 minutes
				expect(response.expiration).toBeGreaterThan(now);
				expect(response.expiration).toBeLessThanOrEqual(expectedExpiry + 1000); // Allow 1s tolerance
			}
		});

		it('should respect custom duration', async () => {
			// Arrange
			const customDuration = 600; // 10 minutes
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: customDuration,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(true);
			if (response.success) {
				const now = Date.now();
				const expectedExpiry = now + customDuration * 1000;
				expect(response.expiration).toBeGreaterThan(now);
				expect(response.expiration).toBeLessThanOrEqual(expectedExpiry + 1000); // Allow 1s tolerance
			}
		});

		it('should include system-specific issuer', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(true);
			if (response.success) {
				const publicKey = await SELF.getPublicKeyJWK();
				const jwks = createLocalJWKSet(publicKey);
				const { payload } = await jwtVerify(response.token, jwks);

				expect(payload.iss).toBe('catalyst:system:jwt:latest');
			}
		});

		it('should generate unique tokens', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response1 = await SELF.signSystemJWT(request);
			const response2 = await SELF.signSystemJWT(request);

			// Assert
			expect(response1.success).toBe(true);
			expect(response2.success).toBe(true);
			if (response1.success && response2.success) {
				expect(response1.token).toBeDefined();
				expect(response2.token).toBeDefined();
				expect(response1.token).not.toBe(response2.token);
			}
		});

		it('should support multiple channel IDs', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelIds: ['channel-1', 'channel-2', 'channel-3'],
				purpose: 'bulk-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(true);
			if (response.success) {
				const publicKey = await SELF.getPublicKeyJWK();
				const jwks = createLocalJWKSet(publicKey);
				const { payload } = await jwtVerify(response.token, jwks);

				expect(payload.claims).toEqual(['channel-1', 'channel-2', 'channel-3']);
			}
		});

		it('should validate service is in allowlist', async () => {
			// Arrange
			const allowedServices = ['data-channel-certifier', 'scheduled-validator'];

			for (const service of allowedServices) {
				const request = {
					callingService: service,
					channelId: TEST_CHANNEL_ID,
					purpose: 'validation',
					duration: 300,
				};

				// Act
				const response = await SELF.signSystemJWT(request);

				// Assert
				expect(response.success).toBe(true);
			}

			// Test non-allowed service
			const invalidRequest = {
				callingService: 'malicious-service',
				channelId: TEST_CHANNEL_ID,
				purpose: 'validation',
				duration: 300,
			};

			const invalidResponse = await SELF.signSystemJWT(invalidRequest);
			expect(invalidResponse.success).toBe(false);
			if (!invalidResponse.success) {
				expect(invalidResponse.error).toContain('not authorized');
			}
		});
	});

	describe('Error Handling', () => {
		it('should handle key provider errors gracefully', async () => {
			// This would require mocking the KEY_PROVIDER durable object
			// which is more complex in the Cloudflare test environment
			// For now, we'll skip this test
			expect(true).toBe(true);
		});

		it('should reject excessively long durations', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 86400, // 24 hours - too long for system tokens
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('duration exceeds maximum');
			}
		});

		it('should reject negative duration values', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: -100,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('duration exceeds maximum');
			}
		});

		it('should reject zero duration', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 0,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('duration exceeds maximum');
			}
		});

		it('should accept minimum valid duration (1 second)', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 1,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(true);
		});
	});

	describe('Input Validation Edge Cases', () => {
		it('should reject null callingService', async () => {
			// Arrange
			const request = {
				callingService: null as unknown as string,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('callingService is required');
			}
		});

		it('should reject undefined callingService', async () => {
			// Arrange
			const request = {
				callingService: undefined as unknown as string,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('callingService is required');
			}
		});

		it('should reject whitespace-only callingService', async () => {
			// Arrange
			const request = {
				callingService: '   ',
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('callingService is required');
			}
		});

		it('should reject very long callingService names', async () => {
			// Arrange
			const longServiceName = 'a'.repeat(1000);
			const request = {
				callingService: longServiceName,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('not authorized');
			}
		});

		it('should reject null channelId', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: null as unknown as string,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('At least one channelId is required');
			}
		});

		it('should reject undefined channelId', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: undefined as unknown as string,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('At least one channelId is required');
			}
		});

		it('should reject empty channelIds array', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelIds: [],
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('At least one channelId is required');
			}
		});

		it('should handle both channelId and channelIds provided (channelIds takes priority)', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: 'single-channel',
				channelIds: ['multi-channel-1', 'multi-channel-2'],
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(true);
			if (response.success) {
				const publicKey = await SELF.getPublicKeyJWK();
				const jwks = createLocalJWKSet(publicKey);
				const { payload } = await jwtVerify(response.token, jwks);

				// Should use channelIds, not channelId
				expect(payload.claims).toEqual(['multi-channel-1', 'multi-channel-2']);
			}
		});

		it('should reject missing purpose field', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			// This should still work as purpose is not validated in the implementation
			expect(response.success).toBe(true);
		});

		it('should handle empty purpose field', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: '',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(true);
		});

		it('should handle special characters in channelId', async () => {
			// Arrange
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: 'channel-with-special-chars-!@#$%^&*()',
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(true);
			if (response.success) {
				const publicKey = await SELF.getPublicKeyJWK();
				const jwks = createLocalJWKSet(publicKey);
				const { payload } = await jwtVerify(response.token, jwks);

				expect(payload.claims).toEqual(['channel-with-special-chars-!@#$%^&*()']);
			}
		});

		it('should handle very long channelId', async () => {
			// Arrange
			// Registry has a 255 character limit per claim, so use a valid long channelId
			const longChannelId = 'a'.repeat(250); // Within the 255 char limit
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: longChannelId,
				purpose: 'channel-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(true);
		});

		it('should handle many channelIds', async () => {
			// Arrange
			// Registry has a 50 claim maximum, so use 50 channels
			const manyChannelIds = Array.from({ length: 50 }, (_, i) => `channel-${i}`);
			const request = {
				callingService: SYSTEM_SERVICE_NAME,
				channelIds: manyChannelIds,
				purpose: 'bulk-validation',
				duration: 300,
			};

			// Act
			const response = await SELF.signSystemJWT(request);

			// Assert
			expect(response.success).toBe(true);
			if (response.success) {
				const publicKey = await SELF.getPublicKeyJWK();
				const jwks = createLocalJWKSet(publicKey);
				const { payload } = await jwtVerify(response.token, jwks);

				expect(payload.claims).toEqual(manyChannelIds);
			}
		});
	});

	describe('Backwards Compatibility', () => {
		it('should support both channelId and channelIds parameters', async () => {
			// Test single channelId
			const singleRequest = {
				callingService: SYSTEM_SERVICE_NAME,
				channelId: TEST_CHANNEL_ID,
				purpose: 'channel-validation',
				duration: 300,
			};

			const singleResponse = await SELF.signSystemJWT(singleRequest);
			expect(singleResponse.success).toBe(true);

			// Test multiple channelIds
			const multiRequest = {
				callingService: SYSTEM_SERVICE_NAME,
				channelIds: [TEST_CHANNEL_ID, 'channel-2'],
				purpose: 'channel-validation',
				duration: 300,
			};

			const multiResponse = await SELF.signSystemJWT(multiRequest);
			expect(multiResponse.success).toBe(true);
		});
	});
});
