import type { ValidationResult, TestResult, ValidationRequest } from '@catalyst/schemas';
import type { Env } from './env';

/**
 * GraphQL Introspection Response Type
 */
interface GraphQLIntrospectionResponse {
  data?: {
    __schema?: {
      queryType?: {
        name?: string;
      };
    };
  };
  errors?: Array<{
    message: string;
    [key: string]: unknown;
  }>;
}

/**
 * Validation Engine for JWT token validation
 * Implements the core validation logic for the MVP
 *
 * Uses a subset of Env bindings (AUTHX_TOKEN_API) for signing validation tokens
 */
export class ValidationEngine {
  constructor(private env: Pick<Env, 'AUTHX_TOKEN_API'>) {}

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
      // 1. JWT Validation Test
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

      // 2. GraphQL Introspection Test
      console.log(`[ValidationEngine] Running introspection test for channel ${request.channelId}`);
      const introspectionTest = await this.testIntrospection(request);
      tests.push(introspectionTest);

      console.log(
        `[ValidationEngine] Introspection test completed for channel ${request.channelId}`,
        {
          success: introspectionTest.success,
          duration: `${introspectionTest.duration}ms`,
          hasErrors: !!introspectionTest.errorDetails,
        }
      );

      // Future tests will be added here as needed

      // Determine overall status based on test results
      // ALL tests must pass for channel to be valid
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
   * Requests a system JWT token for validation purposes
   * Shared helper for JWT validation and introspection tests
   */
  private async requestValidationToken(
    request: ValidationRequest,
    purpose: string
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    console.log(`[ValidationEngine] Requesting system JWT from AUTHX_TOKEN_API`, {
      channelId: request.channelId,
      callingService: 'data-channel-certifier',
      purpose,
    });

    const tokenResponse = await this.env.AUTHX_TOKEN_API.signSystemJWT({
      callingService: 'data-channel-certifier',
      channelId: request.channelId,
      purpose,
      duration: 300, // 5 minutes
    });

    if (!tokenResponse.success || !tokenResponse.token) {
      console.error(`[ValidationEngine] Failed to obtain system JWT`, {
        channelId: request.channelId,
        error: tokenResponse.error,
      });
      return {
        success: false,
        error: tokenResponse.error || 'Failed to obtain validation token',
      };
    }

    console.log(`[ValidationEngine] System JWT obtained successfully`, {
      channelId: request.channelId,
      tokenExpiration: tokenResponse.expiration,
    });

    return {
      success: true,
      token: tokenResponse.token,
    };
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
      const tokenResponse = await this.requestValidationToken(request, 'channel-validation');

      if (!tokenResponse.success || !tokenResponse.token) {
        return {
          testType: 'jwt_validation',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: tokenResponse.error || 'Failed to obtain validation token',
        };
      }

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
   * Tests GraphQL introspection capability
   * Validates that the channel returns a proper GraphQL schema via introspection query
   */
  private async testIntrospection(request: ValidationRequest): Promise<TestResult> {
    const testStart = Date.now();

    console.log(
      `[ValidationEngine:Introspection] Starting introspection test for channel ${request.channelId}`
    );

    try {
      // Step 1: Request a system JWT token for authenticated introspection
      const tokenResponse = await this.requestValidationToken(request, 'channel-introspection');

      if (!tokenResponse.success || !tokenResponse.token) {
        return {
          testType: 'introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: tokenResponse.error || 'Failed to obtain introspection token',
        };
      }

      // Step 2: Send introspection query
      const introspectionQuery = {
        query: `{
          __schema {
            queryType {
              name
            }
          }
        }`,
      };

      console.log(`[ValidationEngine:Introspection] Sending introspection query`, {
        channelId: request.channelId,
        endpoint: request.endpoint,
      });

      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenResponse.token}`,
        },
        body: JSON.stringify(introspectionQuery),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      console.log(`[ValidationEngine:Introspection] Received response`, {
        channelId: request.channelId,
        status: response.status,
      });

      // Step 3: Validate response
      if (response.status !== 200) {
        const errorMsg = `Introspection returned non-200 status: ${response.status}`;
        console.error(`[ValidationEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
        });
        return {
          testType: 'introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Step 4: Parse and validate GraphQL response structure
      let jsonResponse: GraphQLIntrospectionResponse;
      try {
        jsonResponse = (await response.json()) as GraphQLIntrospectionResponse;
      } catch (parseError) {
        const errorMsg = 'Failed to parse JSON response';
        console.error(`[ValidationEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
          error: parseError instanceof Error ? parseError.message : 'Unknown',
        });
        return {
          testType: 'introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Check for GraphQL errors field
      if (jsonResponse.errors) {
        const errorMsg = `GraphQL returned errors: ${JSON.stringify(jsonResponse.errors)}`;
        console.error(`[ValidationEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
        });
        return {
          testType: 'introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Check for data field
      if (!jsonResponse.data) {
        const errorMsg = 'Response missing "data" field - not a valid GraphQL response';
        console.error(`[ValidationEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
          response: jsonResponse,
        });
        return {
          testType: 'introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Check for __schema field
      if (!jsonResponse.data.__schema) {
        const errorMsg =
          'Response missing "__schema" field - introspection not supported or disabled';
        console.error(`[ValidationEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
        });
        return {
          testType: 'introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Check for queryType.name
      if (!jsonResponse.data.__schema.queryType?.name) {
        const errorMsg = 'Response missing "__schema.queryType.name" - invalid schema structure';
        console.error(`[ValidationEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
        });
        return {
          testType: 'introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Success!
      console.log(`[ValidationEngine:Introspection] Introspection test PASSED`, {
        channelId: request.channelId,
        queryTypeName: jsonResponse.data.__schema.queryType.name,
        duration: `${Date.now() - testStart}ms`,
      });

      return {
        testType: 'introspection',
        success: true,
        duration: Date.now() - testStart,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ValidationEngine:Introspection] Test failed with error`, {
        channelId: request.channelId,
        error: errorMsg,
      });
      return {
        testType: 'introspection',
        success: false,
        duration: Date.now() - testStart,
        errorDetails: `Introspection test failed: ${errorMsg}`,
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
      if (!url.hostname || (url.hostname.includes('-') && !url.hostname.includes('.'))) {
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

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(query),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
      } catch (fetchError) {
        console.error(`[ValidationEngine:Test] Fetch request failed`, {
          endpoint,
          testType,
          error: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
          errorName: fetchError instanceof Error ? fetchError.name : 'Unknown',
          stack: fetchError instanceof Error ? fetchError.stack : undefined,
        });

        return {
          accepted: false,
          error: `Fetch request failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        };
      }

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
