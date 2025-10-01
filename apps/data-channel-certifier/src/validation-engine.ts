import type { ValidationResult, TestResult, ValidationRequest } from '@catalyst/schemas';

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

    console.log(`[ValidationEngine] Starting validation for channel ${request.channelId}`, {
      endpoint: request.endpoint,
      organizationId: request.organizationId,
      timestamp: new Date(startTime).toISOString(),
    });

    try {
      // 1. JWT Validation Test (MVP - Implemented)
      console.log(
        `[ValidationEngine] Running JWT validation test for channel ${request.channelId}`
      );
      const jwtTest = await this.testJWTValidation(request);
      tests.push(jwtTest);

      console.log(`[ValidationEngine] JWT test completed for channel ${request.channelId}`, {
        success: jwtTest.success,
        duration: `${jwtTest.duration}ms`,
        hasErrors: !!jwtTest.errorDetails,
      });

      // Future tests will be added here as needed

      // Determine overall status based on test results
      const allPassed = tests.every((test) => test.success);
      const status = allPassed ? 'valid' : 'invalid';

      const totalDuration = Date.now() - startTime;
      console.log(`[ValidationEngine] Validation completed for channel ${request.channelId}`, {
        status,
        totalDuration: `${totalDuration}ms`,
        testsRun: tests.length,
        testsPassed: tests.filter((t) => t.success).length,
      });

      return {
        channelId: request.channelId,
        status,
        timestamp: Date.now(),
        details: {
          endpoint: request.endpoint,
          organizationId: request.organizationId,
          duration: totalDuration,
          tests: tests,
          tokenValidation: jwtTest.success,
          tokenValidationError: jwtTest.errorDetails,
        },
      };
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error(`[ValidationEngine] Validation failed for channel ${request.channelId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${totalDuration}ms`,
        testsCompleted: tests.length,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Handle unexpected errors
      return {
        channelId: request.channelId,
        status: 'error',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: {
          endpoint: request.endpoint,
          organizationId: request.organizationId,
          duration: totalDuration,
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

    console.log(`[ValidationEngine:JWT] Starting JWT validation for channel ${request.channelId}`);

    try {
      // Step 1: Request a system JWT token for this channel
      console.log(`[ValidationEngine:JWT] Requesting system JWT from AUTHX_TOKEN_API`, {
        channelId: request.channelId,
        callingService: 'data-channel-certifier',
        purpose: 'channel-validation',
      });

      const tokenResponse = await this.env.AUTHX_TOKEN_API.signSystemJWT({
        callingService: 'data-channel-certifier',
        channelId: request.channelId,
        purpose: 'channel-validation',
        duration: 300, // 5 minutes
      });

      if (!tokenResponse.success || !tokenResponse.token) {
        console.error(`[ValidationEngine:JWT] Failed to obtain system JWT`, {
          channelId: request.channelId,
          error: tokenResponse.error,
          success: tokenResponse.success,
        });
        return {
          testType: 'jwt_validation',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: tokenResponse.error || 'Failed to obtain validation token',
        };
      }

      console.log(`[ValidationEngine:JWT] System JWT obtained successfully`, {
        channelId: request.channelId,
        tokenExpiration: tokenResponse.expiration,
      });

      // Step 2: Test the channel endpoint with the valid token
      console.log(`[ValidationEngine:JWT] Testing endpoint with VALID token`, {
        channelId: request.channelId,
        endpoint: request.endpoint,
      });
      const validTokenTest = await this.testChannelWithToken(
        request.endpoint,
        tokenResponse.token,
        true // expecting success
      );
      console.log(`[ValidationEngine:JWT] Valid token test result`, {
        channelId: request.channelId,
        accepted: validTokenTest.accepted,
        statusCode: validTokenTest.statusCode,
        error: validTokenTest.error,
      });

      // Step 3: Test the channel endpoint with an invalid token
      console.log(`[ValidationEngine:JWT] Testing endpoint with INVALID token`, {
        channelId: request.channelId,
        endpoint: request.endpoint,
      });
      const invalidToken = 'invalid.jwt.token';
      const invalidTokenTest = await this.testChannelWithToken(
        request.endpoint,
        invalidToken,
        false // expecting rejection
      );
      console.log(`[ValidationEngine:JWT] Invalid token test result`, {
        channelId: request.channelId,
        accepted: invalidTokenTest.accepted,
        statusCode: invalidTokenTest.statusCode,
        error: invalidTokenTest.error,
      });

      // Step 4: Test the channel endpoint with no token
      console.log(`[ValidationEngine:JWT] Testing endpoint with NO token`, {
        channelId: request.channelId,
        endpoint: request.endpoint,
      });
      const noTokenTest = await this.testChannelWithToken(
        request.endpoint,
        '', // empty token
        false // expecting rejection
      );
      console.log(`[ValidationEngine:JWT] No token test result`, {
        channelId: request.channelId,
        accepted: noTokenTest.accepted,
        statusCode: noTokenTest.statusCode,
        error: noTokenTest.error,
      });

      // All tests must pass for JWT validation to succeed:
      // - Valid token should be accepted (authenticated)
      // - Invalid token should be rejected (not authenticated)
      // - No token should be rejected (not authenticated)
      const success = validTokenTest.accepted && invalidTokenTest.accepted && noTokenTest.accepted;

      // Build detailed error message with individual test results
      const errorDetails = success
        ? undefined
        : this.formatJWTTestError(validTokenTest, invalidTokenTest, noTokenTest);

      console.log(`[ValidationEngine:JWT] JWT validation summary`, {
        channelId: request.channelId,
        success,
        validTokenPassed: validTokenTest.accepted,
        invalidTokenPassed: invalidTokenTest.accepted,
        noTokenPassed: noTokenTest.accepted,
        duration: `${Date.now() - testStart}ms`,
      });

      return {
        testType: 'jwt_validation',
        success,
        duration: Date.now() - testStart,
        errorDetails,
        // Include structured test details for UI display
        jwtTestDetails: {
          validToken: {
            accepted: validTokenTest.accepted,
            statusCode: validTokenTest.statusCode,
            error: validTokenTest.error,
          },
          invalidToken: {
            accepted: invalidTokenTest.accepted,
            statusCode: invalidTokenTest.statusCode,
            error: invalidTokenTest.error,
          },
          noToken: {
            accepted: noTokenTest.accepted,
            statusCode: noTokenTest.statusCode,
            error: noTokenTest.error,
          },
        },
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
    const testType = token ? (token === 'invalid.jwt.token' ? 'invalid' : 'valid') : 'none';
    
    // Validate endpoint URL format before making request
    try {
      const url = new URL(endpoint);
      
      // Check for common URL format issues
      if (!url.hostname || url.hostname.includes('-') && !url.hostname.includes('.')) {
        console.error(`[ValidationEngine:Test] Malformed endpoint URL - missing domain`, {
          endpoint,
          hostname: url.hostname,
          suggestion: 'URL appears to be missing a proper domain name (e.g., .com, .org, etc.)',
        });
        return {
          accepted: false,
          error: `Malformed endpoint URL - missing domain: ${endpoint}. Expected format: https://domain.com/path`,
        };
      }
    } catch (urlError) {
      console.error(`[ValidationEngine:Test] Invalid endpoint URL format`, {
        endpoint,
        error: urlError instanceof Error ? urlError.message : 'Invalid URL',
      });
      return {
        accepted: false,
        error: `Invalid endpoint URL format: ${endpoint}`,
      };
    }
    console.log(`[ValidationEngine:Test] Starting ${testType} token test`, {
      endpoint,
      expectSuccess,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
    });

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

      console.log(`[ValidationEngine:Test] Sending GraphQL introspection query`, {
        endpoint,
        hasAuthHeader: !!token,
        testType,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(query),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      console.log(`[ValidationEngine:Test] Received response`, {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        testType,
      });

      // For JWT validation, we only care about authentication status
      const isAuthenticated = response.status !== 401 && response.status !== 403;

      console.log(`[ValidationEngine:Test] Authentication status evaluated`, {
        endpoint,
        testType,
        isAuthenticated,
        expectSuccess,
        testPassed: expectSuccess ? isAuthenticated : !isAuthenticated,
      });

      if (expectSuccess) {
        // Valid token should be authenticated (not 401/403)
        const passed = isAuthenticated;
        console.log(`[ValidationEngine:Test] Valid token test ${passed ? 'PASSED' : 'FAILED'}`, {
          endpoint,
          expected: 'authenticated',
          actual: isAuthenticated ? 'authenticated' : 'rejected',
          statusCode: response.status,
        });
        return {
          accepted: passed,
          statusCode: response.status,
          error: passed ? undefined : `Valid token rejected with status ${response.status}`,
        };
      } else {
        // Invalid token should NOT be authenticated (should be 401/403)
        const passed = !isAuthenticated;
        console.log(
          `[ValidationEngine:Test] Invalid/no token test ${passed ? 'PASSED' : 'FAILED'}`,
          {
            endpoint,
            testType,
            expected: 'rejected',
            actual: isAuthenticated ? 'authenticated' : 'rejected',
            statusCode: response.status,
          }
        );
        return {
          accepted: passed,
          statusCode: response.status,
          error: passed
            ? undefined
            : `${testType === 'none' ? 'Missing' : 'Invalid'} token accepted with status ${response.status}`,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = error instanceof Error && error.name === 'AbortError';

      console.error(`[ValidationEngine:Test] Test failed with error`, {
        endpoint,
        testType,
        error: errorMsg,
        isTimeout,
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (isTimeout) {
        return {
          accepted: false,
          error: 'Request timeout (10s)',
        };
      }

      return {
        accepted: false,
        error: `Network error: ${errorMsg}`,
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
