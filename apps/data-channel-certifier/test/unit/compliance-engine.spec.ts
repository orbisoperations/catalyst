import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComplianceEngine } from '../../src/compliance-engine';
import type { ComplianceRequest } from '@catalyst/schemas';
import type { Env } from '../../src/env';

describe('ComplianceEngine', () => {
  let complianceEngine: ComplianceEngine;
  let mockEnv: Pick<Env, 'AUTHX_TOKEN_API'>;

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

    complianceEngine = new ComplianceEngine(mockEnv);
  });

  describe('verifyCompliance', () => {
    it('should validate a channel with proper JWT authentication behavior', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch:
      // 1. Valid token - returns 200 (authenticated)
      // 2. Invalid token - returns 401 (not authenticated)
      // 3. No token - returns 401 (not authenticated)
      // 4. Introspection - returns valid schema
      // 5. SDL - returns valid federation SDL
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
        } as Response)
        .mockResolvedValueOnce({
          status: 200, // Introspection succeeds
          json: async () => ({
            data: {
              __schema: {
                queryType: {
                  name: 'Query',
                },
              },
            },
          }),
        } as Response)
        .mockResolvedValueOnce({
          status: 200, // SDL succeeds
          json: async () => ({
            data: {
              _sdl: 'type Query { hello: String }',
            },
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'compliant',
        details: expect.objectContaining({
          endpoint: 'https://example.com/graphql',
          organizationId: 'test-org-id',
          authenticationCompliance: true,
          tests: expect.arrayContaining([
            expect.objectContaining({
              testType: 'authentication_compliance',
              success: true,
            }),
            expect.objectContaining({
              testType: 'schema_introspection',
              success: true,
            }),
            expect.objectContaining({
              testType: 'federation_support',
              success: true,
            }),
          ]),
        }),
      });

      // Verify all five requests were made (3 JWT + 1 introspection + 1 SDL)
      expect(global.fetch).toHaveBeenCalledTimes(5);

      // Check that the third call (no token JWT test) had no Authorization header
      const thirdCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[2];
      expect(thirdCall[1].headers['Authorization']).toBeUndefined();
    });

    it('should mark channel as failed when valid token is rejected', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch:
      // 1. Valid token - returns 401 (should be accepted but isn't)
      // 2. Invalid token - returns 401 (correctly rejected)
      // 3. No token - returns 401 (correctly rejected)
      // 4. Introspection - still runs (both tests are independent)
      // 5. SDL - still runs (all tests are independent)
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
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              __schema: {
                queryType: { name: 'Query' },
              },
            },
          }),
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              _sdl: 'type Query { hello: String }',
            },
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          authenticationCompliance: false,
          authenticationError: expect.stringContaining('Valid token rejected'),
        }),
      });
    });

    it('should mark channel as failed when invalid token is accepted', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch:
      // 1. Valid token - returns 200 (correctly accepted)
      // 2. Invalid token - returns 200 (should be rejected but isn't)
      // 3. No token - returns 401 (correctly rejected)
      // 4. Introspection - still runs (both tests are independent)
      // 5. SDL - still runs (all tests are independent)
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
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              __schema: {
                queryType: { name: 'Query' },
              },
            },
          }),
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              _sdl: 'type Query { hello: String }',
            },
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          authenticationCompliance: false,
          authenticationError: expect.stringContaining('Invalid token accepted'),
        }),
      });
    });

    it('should mark channel as failed when no token is accepted', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch:
      // 1. Valid token - returns 200 (correctly accepted)
      // 2. Invalid token - returns 401 (correctly rejected)
      // 3. No token - returns 200 (should be rejected but isn't)
      // 4. Introspection - still runs (both tests are independent)
      // 5. SDL - still runs (all tests are independent)
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
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              __schema: {
                queryType: { name: 'Query' },
              },
            },
          }),
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              _sdl: 'type Query { hello: String }',
            },
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          authenticationCompliance: false,
          authenticationError: expect.stringContaining('No token test failed'),
        }),
      });
    });

    it('should handle network errors gracefully', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch to throw network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          authenticationCompliance: false,
          authenticationError: expect.stringContaining('Network error'),
        }),
      });
    });

    it('should handle timeout errors', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch to simulate timeout
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(timeoutError);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          authenticationCompliance: false,
          authenticationError: expect.stringContaining('Request timeout'),
        }),
      });
    });

    it('should handle token signing failure', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock token signing failure
      mockEnv.AUTHX_TOKEN_API.signSystemJWT = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to sign token',
      });

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          authenticationCompliance: false,
          authenticationError: expect.stringContaining('Failed to sign token'),
        }),
      });
    });

    it('should handle both valid and invalid tokens rejected (no proper authentication)', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch: both tokens get 403 (forbidden)
      // + introspection mock
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 403, // Valid token rejected
        } as Response)
        .mockResolvedValueOnce({
          status: 403, // Invalid token rejected
        } as Response)
        .mockResolvedValueOnce({
          status: 403, // No token rejected
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              __schema: {
                queryType: { name: 'Query' },
              },
            },
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          authenticationCompliance: false,
          authenticationError: expect.stringContaining('Valid token rejected'),
        }),
      });
    });
  });

  describe('GraphQL SDL/Federation Validation', () => {
    it('should validate channel with proper SDL response', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch for JWT validation (3 calls) + introspection (1 call) + SDL (1 call)
      global.fetch = vi
        .fn()
        // JWT validation tests
        .mockResolvedValueOnce({ status: 200 } as Response) // Valid token accepted
        .mockResolvedValueOnce({ status: 401 } as Response) // Invalid token rejected
        .mockResolvedValueOnce({ status: 401 } as Response) // No token rejected
        // Introspection test
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              __schema: {
                queryType: {
                  name: 'Query',
                },
              },
            },
          }),
        } as Response)
        // SDL test
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              _sdl: 'type Query { hello: String }',
            },
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'compliant',
        details: expect.objectContaining({
          tests: expect.arrayContaining([
            expect.objectContaining({
              testType: 'authentication_compliance',
              success: true,
            }),
            expect.objectContaining({
              testType: 'schema_introspection',
              success: true,
            }),
            expect.objectContaining({
              testType: 'federation_support',
              success: true,
            }),
          ]),
        }),
      });

      // Verify 5 total fetch calls (3 JWT + 1 introspection + 1 SDL)
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('should fail validation when _sdl query returns errors', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      global.fetch = vi
        .fn()
        // JWT validation tests (passing)
        .mockResolvedValueOnce({ status: 200 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        // Introspection test (passing)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              __schema: {
                queryType: { name: 'Query' },
              },
            },
          }),
        } as Response)
        // SDL test - GraphQL errors
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            errors: [
              {
                message: 'Field "_sdl" not found',
              },
            ],
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          tests: expect.arrayContaining([
            expect.objectContaining({
              testType: 'federation_support',
              success: false,
              errorDetails: expect.stringContaining('errors'),
            }),
          ]),
        }),
      });
    });

    it('should fail validation when _sdl field is missing', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      global.fetch = vi
        .fn()
        // JWT validation tests (passing)
        .mockResolvedValueOnce({ status: 200 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        // Introspection test (passing)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              __schema: {
                queryType: { name: 'Query' },
              },
            },
          }),
        } as Response)
        // SDL test - missing _sdl field
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {}, // No _sdl field
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          tests: expect.arrayContaining([
            expect.objectContaining({
              testType: 'federation_support',
              success: false,
              errorDetails: expect.stringContaining('_sdl'),
            }),
          ]),
        }),
      });
    });

    it('should fail validation when _sdl query returns non-200 status', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      global.fetch = vi
        .fn()
        // JWT validation tests (passing)
        .mockResolvedValueOnce({ status: 200 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        // Introspection test (passing)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              __schema: {
                queryType: { name: 'Query' },
              },
            },
          }),
        } as Response)
        // SDL test - server error
        .mockResolvedValueOnce({
          status: 500,
          json: async () => ({}),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          tests: expect.arrayContaining([
            expect.objectContaining({
              testType: 'federation_support',
              success: false,
              errorDetails: expect.stringContaining('500'),
            }),
          ]),
        }),
      });
    });
  });

  describe('GraphQL Introspection Validation', () => {
    it('should validate channel with proper introspection response', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      // Mock fetch for JWT validation (3 calls) + introspection (1 call) + SDL (1 call)
      global.fetch = vi
        .fn()
        // JWT validation tests
        .mockResolvedValueOnce({ status: 200 } as Response) // Valid token accepted
        .mockResolvedValueOnce({ status: 401 } as Response) // Invalid token rejected
        .mockResolvedValueOnce({ status: 401 } as Response) // No token rejected
        // Introspection test
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              __schema: {
                queryType: {
                  name: 'Query',
                },
              },
            },
          }),
        } as Response)
        // SDL test
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {
              _sdl: 'type Query { hello: String }',
            },
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'compliant',
        details: expect.objectContaining({
          tests: expect.arrayContaining([
            expect.objectContaining({
              testType: 'authentication_compliance',
              success: true,
            }),
            expect.objectContaining({
              testType: 'schema_introspection',
              success: true,
            }),
            expect.objectContaining({
              testType: 'federation_support',
              success: true,
            }),
          ]),
        }),
      });

      // Verify 5 total fetch calls (3 for JWT + 1 for introspection + 1 for SDL)
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('should fail validation when __schema field is missing', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      global.fetch = vi
        .fn()
        // JWT validation tests (passing)
        .mockResolvedValueOnce({ status: 200 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        // Introspection test - missing __schema
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            data: {}, // No __schema field
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          tests: expect.arrayContaining([
            expect.objectContaining({
              testType: 'schema_introspection',
              success: false,
              errorDetails: expect.stringContaining('__schema'),
            }),
          ]),
        }),
      });
    });

    it('should fail validation for malformed GraphQL response', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      global.fetch = vi
        .fn()
        // JWT validation tests (passing)
        .mockResolvedValueOnce({ status: 200 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        // Introspection test - no data field at all
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            result: 'something else', // Not a GraphQL response
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          tests: expect.arrayContaining([
            expect.objectContaining({
              testType: 'schema_introspection',
              success: false,
              errorDetails: expect.stringContaining('data'),
            }),
          ]),
        }),
      });
    });

    it('should fail validation when GraphQL returns errors field', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      global.fetch = vi
        .fn()
        // JWT validation tests (passing)
        .mockResolvedValueOnce({ status: 200 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        // Introspection test - GraphQL errors
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({
            errors: [
              {
                message: 'Field "__schema" not found',
              },
            ],
          }),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          tests: expect.arrayContaining([
            expect.objectContaining({
              testType: 'schema_introspection',
              success: false,
              errorDetails: expect.stringContaining('errors'),
            }),
          ]),
        }),
      });
    });

    it('should fail validation when introspection returns non-200 status', async () => {
      const request: ComplianceRequest = {
        channelId: 'test-channel-id',
        endpoint: 'https://example.com/graphql',
        organizationId: 'test-org-id',
      };

      global.fetch = vi
        .fn()
        // JWT validation tests (passing)
        .mockResolvedValueOnce({ status: 200 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        .mockResolvedValueOnce({ status: 401 } as Response)
        // Introspection test - server error
        .mockResolvedValueOnce({
          status: 500,
          json: async () => ({}),
        } as Response);

      const result = await complianceEngine.verifyCompliance(request);

      expect(result).toMatchObject({
        channelId: 'test-channel-id',
        status: 'non_compliant',
        details: expect.objectContaining({
          tests: expect.arrayContaining([
            expect.objectContaining({
              testType: 'schema_introspection',
              success: false,
              errorDetails: expect.stringContaining('500'),
            }),
          ]),
        }),
      });
    });
  });
});
