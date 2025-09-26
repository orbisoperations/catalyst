import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationEngine, ValidationEnv, ValidationRequest } from '../../src/validation-engine';

describe('ValidationEngine', () => {
  let validationEngine: ValidationEngine;
  let mockEnv: ValidationEnv;

  beforeEach(() => {
    // Mock the AUTHX_TOKEN_API service
    mockEnv = {
      AUTHX_TOKEN_API: {
        signSystemJWT: vi.fn().mockResolvedValue({
          success: true,
          token: 'valid.jwt.token',
          expiration: Date.now() + 300000, // 5 minutes
        }),
      },
    };

    validationEngine = new ValidationEngine(mockEnv);
  });

  describe('validateChannel', () => {
    it('should validate a channel with proper JWT authentication behavior', async () => {
      const request: ValidationRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch:
      // 1. Valid token - returns 200 (authenticated)
      // 2. Invalid token - returns 401 (not authenticated)
      // 3. No token - returns 401 (not authenticated)
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 200, // Valid token accepted
        } as Response)
        .mockResolvedValueOnce({
          status: 401, // Invalid token rejected
        } as Response)
        .mockResolvedValueOnce({
          status: 401, // No token rejected
        } as Response);

      const result = await validationEngine.validateChannel(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'valid',
        details: expect.objectContaining({
          endpoint: 'https://example.com/graphql',
          organizationId: 'test-org-id',
          tokenValidation: true,
        }),
      });

      // Verify all three requests were made
      expect(global.fetch).toHaveBeenCalledTimes(3);

      // Check that the third call had no Authorization header
      const thirdCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[2];
      expect(thirdCall[1].headers['Authorization']).toBeUndefined();
    });

    it('should mark channel as invalid when valid token is rejected', async () => {
      const request: ValidationRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch:
      // 1. Valid token - returns 401 (should be accepted but isn't)
      // 2. Invalid token - returns 401 (correctly rejected)
      // 3. No token - returns 401 (correctly rejected)
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 401, // Valid token incorrectly rejected
        } as Response)
        .mockResolvedValueOnce({
          status: 401, // Invalid token correctly rejected
        } as Response)
        .mockResolvedValueOnce({
          status: 401, // No token correctly rejected
        } as Response);

      const result = await validationEngine.validateChannel(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'invalid',
        details: expect.objectContaining({
          tokenValidation: false,
          tokenValidationError: expect.stringContaining('Valid token rejected'),
        }),
      });
    });

    it('should mark channel as invalid when invalid token is accepted', async () => {
      const request: ValidationRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch:
      // 1. Valid token - returns 200 (correctly accepted)
      // 2. Invalid token - returns 200 (should be rejected but isn't)
      // 3. No token - returns 401 (correctly rejected)
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 200, // Valid token correctly accepted
        } as Response)
        .mockResolvedValueOnce({
          status: 200, // Invalid token incorrectly accepted
        } as Response)
        .mockResolvedValueOnce({
          status: 401, // No token correctly rejected
        } as Response);

      const result = await validationEngine.validateChannel(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'invalid',
        details: expect.objectContaining({
          tokenValidation: false,
          tokenValidationError: expect.stringContaining('Invalid token accepted'),
        }),
      });
    });

    it('should mark channel as invalid when no token is accepted', async () => {
      const request: ValidationRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch:
      // 1. Valid token - returns 200 (correctly accepted)
      // 2. Invalid token - returns 401 (correctly rejected)
      // 3. No token - returns 200 (should be rejected but isn't)
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 200, // Valid token correctly accepted
        } as Response)
        .mockResolvedValueOnce({
          status: 401, // Invalid token correctly rejected
        } as Response)
        .mockResolvedValueOnce({
          status: 200, // No token incorrectly accepted
        } as Response);

      const result = await validationEngine.validateChannel(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'invalid',
        details: expect.objectContaining({
          tokenValidation: false,
          tokenValidationError: expect.stringContaining('No token test failed'),
        }),
      });
    });

    it('should handle network errors gracefully', async () => {
      const request: ValidationRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch to throw network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await validationEngine.validateChannel(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'invalid',
        details: expect.objectContaining({
          tokenValidation: false,
          tokenValidationError: expect.stringContaining('Network error'),
        }),
      });
    });

    it('should handle timeout errors', async () => {
      const request: ValidationRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch to simulate timeout
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(timeoutError);

      const result = await validationEngine.validateChannel(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'invalid',
        details: expect.objectContaining({
          tokenValidation: false,
          tokenValidationError: expect.stringContaining('Request timeout'),
        }),
      });
    });

    it('should handle token signing failure', async () => {
      const request: ValidationRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock token signing failure
      mockEnv.AUTHX_TOKEN_API.signSystemJWT = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to sign token',
      });

      const result = await validationEngine.validateChannel(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'invalid',
        details: expect.objectContaining({
          tokenValidation: false,
          tokenValidationError: expect.stringContaining('Failed to sign token'),
        }),
      });
    });

    it('should handle both valid and invalid tokens rejected (no proper authentication)', async () => {
      const request: ValidationRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch: both tokens get 403 (forbidden)
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 403, // Valid token rejected
        } as Response)
        .mockResolvedValueOnce({
          status: 403, // Invalid token rejected
        } as Response);

      const result = await validationEngine.validateChannel(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'invalid',
        details: expect.objectContaining({
          tokenValidation: false,
          tokenValidationError: expect.stringContaining('Valid token rejected'),
        }),
      });
    });
  });
});
