import { ValidationResult } from './schemas';

/**
 * Test result for individual validation tests
 */
export interface TestResult {
  testType: 'jwt_validation' | 'introspection' | 'schema_compliance';
  success: boolean;
  duration: number;
  errorDetails?: string;
}

/**
 * Validation request for a data channel
 */
export interface ValidationRequest {
  channelId: string;
  endpoint: string;
  organizationId: string;
}

/**
 * Environment bindings for the validation engine
 */
export interface ValidationEnv {
  AUTHX_TOKEN_API: {
    signSystemJWT(params: {
      callingService: string;
      channelId: string;
      purpose: string;
      duration?: number;
    }): Promise<{ success: boolean; token?: string; expiration?: number; error?: string }>;
  };
}

/**
 * Validation Engine for JWT token validation
 * Implements the core validation logic for the MVP
 */
export class ValidationEngine {
  constructor(private env: ValidationEnv) {}

  /**
   * Validates a data channel endpoint with all configured tests
   * MVP implementation starts with JWT validation, other tests to be added
   */
  async validateChannel(request: ValidationRequest): Promise<ValidationResult> {
    const startTime = Date.now();
    const tests: TestResult[] = [];

    try {
      // 1. JWT Validation Test (MVP - Implemented)
      const jwtTest = await this.testJWTValidation(request);
      tests.push(jwtTest);

      // Future tests will be added here as needed

      // Determine overall status based on test results
      const allPassed = tests.every((test) => test.success);
      const status = allPassed ? 'valid' : 'invalid';

      return {
        channelId: request.channelId,
        status,
        timestamp: Date.now(),
        details: {
          endpoint: request.endpoint,
          organizationId: request.organizationId,
          duration: Date.now() - startTime,
          tests: tests,
          tokenValidation: jwtTest.success,
          tokenValidationError: jwtTest.errorDetails,
        },
      };
    } catch (error) {
      // Handle unexpected errors
      return {
        channelId: request.channelId,
        status: 'error',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: {
          endpoint: request.endpoint,
          organizationId: request.organizationId,
          duration: Date.now() - startTime,
          tests: tests,
        },
      };
    }
  }

  /**
   * Tests JWT token validation for a data channel
   * Validates that the channel accepts valid tokens and rejects invalid ones
   */
  private async testJWTValidation(request: ValidationRequest): Promise<TestResult> {
    const testStart = Date.now();

    try {
      // Step 1: Request a system JWT token for this channel
      const tokenResponse = await this.env.AUTHX_TOKEN_API.signSystemJWT({
        callingService: 'data-channel-certifier',
        channelId: request.channelId,
        purpose: 'channel-validation',
        duration: 300, // 5 minutes
      });

      if (!tokenResponse.success || !tokenResponse.token) {
        return {
          testType: 'jwt_validation',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: tokenResponse.error || 'Failed to obtain validation token',
        };
      }

      // Step 2: Test the channel endpoint with the valid token
      const validTokenTest = await this.testChannelWithToken(
        request.endpoint,
        tokenResponse.token,
        true // expecting success
      );

      // Step 3: Test the channel endpoint with an invalid token
      const invalidToken = 'invalid.jwt.token';
      const invalidTokenTest = await this.testChannelWithToken(
        request.endpoint,
        invalidToken,
        false // expecting rejection
      );

      // Step 4: Test the channel endpoint with no token
      const noTokenTest = await this.testChannelWithToken(
        request.endpoint,
        '', // empty token
        false // expecting rejection
      );

      // All tests must pass for JWT validation to succeed:
      // - Valid token should be accepted (authenticated)
      // - Invalid token should be rejected (not authenticated)
      // - No token should be rejected (not authenticated)
      const success = validTokenTest.accepted && invalidTokenTest.accepted && noTokenTest.accepted;

      return {
        testType: 'jwt_validation',
        success,
        duration: Date.now() - testStart,
        errorDetails: success
          ? undefined
          : this.formatJWTTestError(validTokenTest, invalidTokenTest, noTokenTest),
      };
    } catch (error) {
      return {
        testType: 'jwt_validation',
        success: false,
        duration: Date.now() - testStart,
        errorDetails: `JWT validation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Tests if a channel endpoint properly validates JWT tokens
   * Focuses purely on authentication behavior - accepts valid tokens, rejects invalid ones
   */
  private async testChannelWithToken(
    endpoint: string,
    token: string,
    expectSuccess: boolean
  ): Promise<{ accepted: boolean; statusCode?: number; error?: string }> {
    try {
      // Simple introspection query to test authentication
      const query = {
        query: `{
          __schema {
            queryType { name }
          }
        }`,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Only add Authorization header if token is provided
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(query),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      // For JWT validation, we only care about authentication status
      const isAuthenticated = response.status !== 401 && response.status !== 403;

      if (expectSuccess) {
        // Valid token should be authenticated (not 401/403)
        return {
          accepted: isAuthenticated,
          statusCode: response.status,
          error: isAuthenticated
            ? undefined
            : `Valid token rejected with status ${response.status}`,
        };
      } else {
        // Invalid token should NOT be authenticated (should be 401/403)
        return {
          accepted: !isAuthenticated,
          statusCode: response.status,
          error: !isAuthenticated
            ? undefined
            : `Invalid token accepted with status ${response.status}`,
        };
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          accepted: false,
          error: 'Request timeout (10s)',
        };
      }

      return {
        accepted: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }

  /**
   * Formats error message for JWT validation test failures
   */
  private formatJWTTestError(
    validTokenTest: { accepted: boolean; error?: string },
    invalidTokenTest: { accepted: boolean; error?: string },
    noTokenTest: { accepted: boolean; error?: string }
  ): string {
    const errors: string[] = [];

    if (!validTokenTest.accepted) {
      errors.push(`Valid token rejected: ${validTokenTest.error || 'Unknown reason'}`);
    }

    if (!invalidTokenTest.accepted) {
      errors.push(
        `Invalid token test failed: ${invalidTokenTest.error || 'Channel did not reject invalid token'}`
      );
    }

    if (!noTokenTest.accepted) {
      errors.push(
        `No token test failed: ${noTokenTest.error || 'Channel did not reject missing token'}`
      );
    }

    return errors.join('; ');
  }
}
