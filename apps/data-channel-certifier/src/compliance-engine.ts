import type { ComplianceResult, TestResult, ComplianceRequest } from '@catalyst/schemas';
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
 * GraphQL SDL Response Type (used for federation schema stitching)
 */
interface GraphQLSDLResponse {
  data?: {
    _sdl?: string;
  };
  errors?: Array<{
    message: string;
    [key: string]: unknown;
  }>;
}

/**
 * Compliance Engine for data channel compliance verification
 * Implements the core compliance checking logic for the MVP
 *
 * Uses a subset of Env bindings (AUTHX_TOKEN_API) for signing compliance check tokens
 */
export class ComplianceEngine {
  constructor(private env: Pick<Env, 'AUTHX_TOKEN_API'>) {}

  /**
   * Verifies a data channel endpoint compliance with all configured tests
   * Performs JWT authentication compliance, introspection, and SDL federation tests
   */
  async verifyCompliance(request: ComplianceRequest): Promise<ComplianceResult> {
    const startTime = Date.now();
    const tests: TestResult[] = [];

    console.log(`[ComplianceEngine] Starting compliance check for channel ${request.channelId}`, {
      endpoint: request.endpoint,
      organizationId: request.organizationId,
      timestamp: new Date(startTime).toISOString(),
    });

    try {
      // 1. JWT Compliance Test
      console.log(
        `[ComplianceEngine] Running JWT compliance test for channel ${request.channelId}`
      );
      const jwtTest = await this.testJWTCompliance(request);
      tests.push(jwtTest);

      console.log(`[ComplianceEngine] JWT test completed for channel ${request.channelId}`, {
        success: jwtTest.success,
        duration: `${jwtTest.duration}ms`,
        hasErrors: !!jwtTest.errorDetails,
      });

      // 2. GraphQL Introspection Test
      console.log(`[ComplianceEngine] Running introspection test for channel ${request.channelId}`);
      const introspectionTest = await this.testIntrospection(request);
      tests.push(introspectionTest);

      console.log(
        `[ComplianceEngine] Introspection test completed for channel ${request.channelId}`,
        {
          success: introspectionTest.success,
          duration: `${introspectionTest.duration}ms`,
          hasErrors: !!introspectionTest.errorDetails,
        }
      );

      // 3. SDL Federation Test
      console.log(
        `[ComplianceEngine] Running SDL federation test for channel ${request.channelId}`
      );
      const sdlTest = await this.testSDLFederation(request);
      tests.push(sdlTest);

      console.log(
        `[ComplianceEngine] SDL federation test completed for channel ${request.channelId}`,
        {
          success: sdlTest.success,
          duration: `${sdlTest.duration}ms`,
          hasErrors: !!sdlTest.errorDetails,
        }
      );

      // Future tests will be added here as needed

      // Determine overall status based on test results
      // ALL tests must pass for channel to be compliant
      const allPassed = tests.every((test) => test.success);
      const status = allPassed ? 'compliant' : 'non_compliant';

      const totalDuration = Date.now() - startTime;
      console.log(
        `[ComplianceEngine] Compliance check completed for channel ${request.channelId}`,
        {
          status,
          totalDuration: `${totalDuration}ms`,
          testsRun: tests.length,
          testsPassed: tests.filter((t) => t.success).length,
        }
      );

      return {
        channelId: request.channelId,
        status,
        timestamp: Date.now(),
        details: {
          endpoint: request.endpoint,
          organizationId: request.organizationId,
          duration: totalDuration,
          tests: tests,
          authenticationCompliance: jwtTest.success,
          authenticationError: jwtTest.errorDetails,
        },
      };
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error(`[ComplianceEngine] Compliance check failed for channel ${request.channelId}`, {
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
   * Requests a system JWT token for compliance verification purposes
   * Shared helper for JWT authentication compliance and introspection tests
   */
  private async requestComplianceToken(
    request: CertificationRequest,
    operation: string
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    console.log(`[ComplianceEngine] Requesting system JWT from AUTHX_TOKEN_API`, {
      channelId: request.channelId,
      callingService: 'data-channel-certifier',
      operation,
    });

    const tokenResponse = await this.env.AUTHX_TOKEN_API.signSystemJWT({
      callingService: 'data-channel-certifier',
      channelId: request.channelId,
      operation,
      duration: 300, // 5 minutes
    });

    if (!tokenResponse.success || !tokenResponse.token) {
      console.error(`[ComplianceEngine] Failed to obtain system JWT`, {
        channelId: request.channelId,
        error: tokenResponse.error,
      });
      return {
        success: false,
        error: tokenResponse.error || 'Failed to obtain compliance token',
      };
    }

    console.log(`[ComplianceEngine] System JWT obtained successfully`, {
      channelId: request.channelId,
      tokenExpiration: tokenResponse.expiration,
    });

    return {
      success: true,
      token: tokenResponse.token,
    };
  }

  /**
   * Tests JWT authentication compliance for a data channel
   * Validates that the channel accepts valid tokens and rejects invalid ones
   */
  private async testJWTCompliance(request: CertificationRequest): Promise<TestResult> {
    const testStart = Date.now();

    console.log(`[ComplianceEngine:JWT] Starting JWT compliance for channel ${request.channelId}`);

    try {
      // Step 1: Request a system JWT token for this channel
      const tokenResponse = await this.requestComplianceToken(request, 'authentication-compliance');

      if (!tokenResponse.success || !tokenResponse.token) {
        return {
          testType: 'authentication_compliance',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: tokenResponse.error || 'Failed to obtain compliance token',
        };
      }

      // Step 2: Test the channel endpoint with the valid token
      console.log(`[ComplianceEngine:JWT] Testing endpoint with VALID token`, {
        channelId: request.channelId,
        endpoint: request.endpoint,
      });
      const validTokenTest = await this.testChannelWithToken(
        request.endpoint,
        tokenResponse.token,
        true // expecting success
      );
      console.log(`[ComplianceEngine:JWT] Valid token test result`, {
        channelId: request.channelId,
        accepted: validTokenTest.accepted,
        statusCode: validTokenTest.statusCode,
        error: validTokenTest.error,
      });

      // Step 3: Test the channel endpoint with an invalid token
      console.log(`[ComplianceEngine:JWT] Testing endpoint with INVALID token`, {
        channelId: request.channelId,
        endpoint: request.endpoint,
      });
      const invalidToken = 'invalid.jwt.token';
      const invalidTokenTest = await this.testChannelWithToken(
        request.endpoint,
        invalidToken,
        false // expecting rejection
      );
      console.log(`[ComplianceEngine:JWT] Invalid token test result`, {
        channelId: request.channelId,
        accepted: invalidTokenTest.accepted,
        statusCode: invalidTokenTest.statusCode,
        error: invalidTokenTest.error,
      });

      // Step 4: Test the channel endpoint with no token
      console.log(`[ComplianceEngine:JWT] Testing endpoint with NO token`, {
        channelId: request.channelId,
        endpoint: request.endpoint,
      });
      const noTokenTest = await this.testChannelWithToken(
        request.endpoint,
        '', // empty token
        false // expecting rejection
      );
      console.log(`[ComplianceEngine:JWT] No token test result`, {
        channelId: request.channelId,
        accepted: noTokenTest.accepted,
        statusCode: noTokenTest.statusCode,
        error: noTokenTest.error,
      });

      // All tests must pass for JWT compliance to succeed:
      // - Valid token should be accepted (authenticated)
      // - Invalid token should be rejected (not authenticated)
      // - No token should be rejected (not authenticated)
      const success = validTokenTest.accepted && invalidTokenTest.accepted && noTokenTest.accepted;

      // Build detailed error message with individual test results
      const errorDetails = success
        ? undefined
        : this.formatJWTTestError(validTokenTest, invalidTokenTest, noTokenTest);

      console.log(`[ComplianceEngine:JWT] JWT compliance summary`, {
        channelId: request.channelId,
        success,
        validTokenPassed: validTokenTest.accepted,
        invalidTokenPassed: invalidTokenTest.accepted,
        noTokenPassed: noTokenTest.accepted,
        duration: `${Date.now() - testStart}ms`,
      });

      return {
        testType: 'authentication_compliance',
        success,
        duration: Date.now() - testStart,
        errorDetails,
        // Include structured test details for UI display
        jwtAuthenticationDetails: {
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
        testType: 'authentication_compliance',
        success: false,
        duration: Date.now() - testStart,
        errorDetails: `JWT authentication compliance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Tests GraphQL introspection capability
   * Validates that the channel returns a proper GraphQL schema via introspection query
   */
  private async testIntrospection(request: CertificationRequest): Promise<TestResult> {
    const testStart = Date.now();

    console.log(
      `[ComplianceEngine:Introspection] Starting introspection test for channel ${request.channelId}`
    );

    try {
      // Step 1: Request a system JWT token for authenticated introspection
      const tokenResponse = await this.requestComplianceToken(request, 'introspection-compliance');

      if (!tokenResponse.success || !tokenResponse.token) {
        return {
          testType: 'schema_introspection',
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

      console.log(`[ComplianceEngine:Introspection] Sending introspection query`, {
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

      console.log(`[ComplianceEngine:Introspection] Received response`, {
        channelId: request.channelId,
        status: response.status,
      });

      // Step 3: Validate response
      if (response.status !== 200) {
        const errorMsg = `Introspection returned non-200 status: ${response.status}`;
        console.error(`[ComplianceEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
        });
        return {
          testType: 'schema_introspection',
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
        console.error(`[ComplianceEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
          error: parseError instanceof Error ? parseError.message : 'Unknown',
        });
        return {
          testType: 'schema_introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Check for GraphQL errors field
      if (jsonResponse.errors) {
        const errorMsg = `GraphQL returned errors: ${JSON.stringify(jsonResponse.errors)}`;
        console.error(`[ComplianceEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
        });
        return {
          testType: 'schema_introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Check for data field
      if (!jsonResponse.data) {
        const errorMsg = 'Response missing "data" field - not a valid GraphQL response';
        console.error(`[ComplianceEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
          response: jsonResponse,
        });
        return {
          testType: 'schema_introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Check for __schema field
      if (!jsonResponse.data.__schema) {
        const errorMsg =
          'Response missing "__schema" field - introspection not supported or disabled';
        console.error(`[ComplianceEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
        });
        return {
          testType: 'schema_introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Check for queryType.name
      if (!jsonResponse.data.__schema.queryType?.name) {
        const errorMsg = 'Response missing "__schema.queryType.name" - invalid schema structure';
        console.error(`[ComplianceEngine:Introspection] ${errorMsg}`, {
          channelId: request.channelId,
        });
        return {
          testType: 'schema_introspection',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Success!
      console.log(`[ComplianceEngine:Introspection] Introspection test PASSED`, {
        channelId: request.channelId,
        queryTypeName: jsonResponse.data.__schema.queryType.name,
        duration: `${Date.now() - testStart}ms`,
      });

      return {
        testType: 'schema_introspection',
        success: true,
        duration: Date.now() - testStart,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ComplianceEngine:Introspection] Test failed with error`, {
        channelId: request.channelId,
        error: errorMsg,
      });
      return {
        testType: 'schema_introspection',
        success: false,
        duration: Date.now() - testStart,
        errorDetails: `Introspection test failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Tests if a channel endpoint returns a valid SDL for schema stitching
   *
   * Performs the following checks:
   * 1. Obtains system JWT token
   * 2. Sends `{ _sdl }` query to endpoint (used by gateway for schema stitching)
   * 3. Validates 200 status code
   * 4. Parses JSON response
   * 5. Checks for no GraphQL errors
   * 6. Validates _sdl field exists and is a string
   * 7. Validates _sdl is non-empty
   *
   * @param request - Certification request containing channel details
   * @returns Test result with success/failure and timing information
   */
  private async testSDLFederation(request: CertificationRequest): Promise<TestResult> {
    const testStart = Date.now();

    console.log(`[ComplianceEngine:SDL] Starting SDL federation test`, {
      channelId: request.channelId,
      endpoint: request.endpoint,
    });

    try {
      // Step 1: Obtain system JWT token
      const tokenResult = await this.requestComplianceToken(request, 'federation-compliance');
      if (!tokenResult.success || !tokenResult.token) {
        return {
          testType: 'federation_support',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: tokenResult.error || 'Failed to obtain compliance token',
        };
      }

      const token = tokenResult.token;

      // Step 2: Send SDL query to the endpoint
      const sdlQuery = `{ _sdl }`;

      console.log(`[ComplianceEngine:SDL] Sending SDL query to endpoint`, {
        channelId: request.channelId,
        endpoint: request.endpoint,
      });

      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: sdlQuery,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      // Step 3: Check status code
      if (response.status !== 200) {
        const errorMsg = `SDL query returned non-200 status: ${response.status}`;
        console.error(`[ComplianceEngine:SDL] ${errorMsg}`, {
          channelId: request.channelId,
          status: response.status,
        });
        return {
          testType: 'federation_support',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Step 4: Parse response
      let jsonResponse: GraphQLSDLResponse;

      try {
        jsonResponse = (await response.json()) as GraphQLSDLResponse;
      } catch (parseError) {
        const errorMsg = `Failed to parse SDL query response as JSON`;
        console.error(`[ComplianceEngine:SDL] ${errorMsg}`, {
          channelId: request.channelId,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown',
        });
        return {
          testType: 'federation_support',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Step 5: Check for GraphQL errors
      if (jsonResponse.errors && jsonResponse.errors.length > 0) {
        const errorMsg = `SDL query returned GraphQL errors: ${jsonResponse.errors.map((e) => e.message).join(', ')}`;
        console.error(`[ComplianceEngine:SDL] ${errorMsg}`, {
          channelId: request.channelId,
          errors: jsonResponse.errors,
        });
        return {
          testType: 'federation_support',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Step 6: Validate _sdl field exists
      if (!jsonResponse.data || typeof jsonResponse.data._sdl !== 'string') {
        const errorMsg = 'Response missing "_sdl" field or it is not a string';
        console.error(`[ComplianceEngine:SDL] ${errorMsg}`, {
          channelId: request.channelId,
          hasData: !!jsonResponse.data,
          sdlType: jsonResponse.data?._sdl ? typeof jsonResponse.data._sdl : 'undefined',
        });
        return {
          testType: 'federation_support',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Step 7: Validate _sdl is non-empty
      if (jsonResponse.data._sdl.trim().length === 0) {
        const errorMsg = 'SDL string is empty';
        console.error(`[ComplianceEngine:SDL] ${errorMsg}`, {
          channelId: request.channelId,
        });
        return {
          testType: 'federation_support',
          success: false,
          duration: Date.now() - testStart,
          errorDetails: errorMsg,
        };
      }

      // Success!
      console.log(`[ComplianceEngine:SDL] SDL federation test PASSED`, {
        channelId: request.channelId,
        sdlLength: jsonResponse.data._sdl.length,
        duration: `${Date.now() - testStart}ms`,
      });

      return {
        testType: 'federation_support',
        success: true,
        duration: Date.now() - testStart,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ComplianceEngine:SDL] Test failed with error`, {
        channelId: request.channelId,
        error: errorMsg,
      });
      return {
        testType: 'federation_support',
        success: false,
        duration: Date.now() - testStart,
        errorDetails: `SDL federation test failed: ${errorMsg}`,
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
    const jwtTestScenario = token ? (token === 'invalid.jwt.token' ? 'invalid' : 'valid') : 'none';

    // Validate endpoint URL format before making request
    try {
      const url = new URL(endpoint);

      // Check for common URL format issues
      if (!url.hostname || (url.hostname.includes('-') && !url.hostname.includes('.'))) {
        console.error(`[ComplianceEngine:Test] Malformed endpoint URL - missing domain`, {
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
      console.error(`[ComplianceEngine:Test] Invalid endpoint URL format`, {
        endpoint,
        error: urlError instanceof Error ? urlError.message : 'Invalid URL',
      });
      return {
        accepted: false,
        error: `Invalid endpoint URL format: ${endpoint}`,
      };
    }
    console.log(`[ComplianceEngine:Test] Starting ${jwtTestScenario} token test`, {
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

      console.log(`[ComplianceEngine:Test] Sending GraphQL introspection query`, {
        endpoint,
        hasAuthHeader: !!token,
        jwtTestScenario,
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
        console.error(`[ComplianceEngine:Test] Fetch request failed`, {
          endpoint,
          jwtTestScenario,
          error: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
          errorName: fetchError instanceof Error ? fetchError.name : 'Unknown',
          stack: fetchError instanceof Error ? fetchError.stack : undefined,
        });

        return {
          accepted: false,
          error: `Fetch request failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        };
      }

      console.log(`[ComplianceEngine:Test] Received response`, {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        jwtTestScenario,
      });

      // For JWT compliance, we only care about authentication status
      const isAuthenticated = response.status !== 401 && response.status !== 403;

      console.log(`[ComplianceEngine:Test] Authentication status evaluated`, {
        endpoint,
        jwtTestScenario,
        isAuthenticated,
        expectSuccess,
        testPassed: expectSuccess ? isAuthenticated : !isAuthenticated,
      });

      if (expectSuccess) {
        // Valid token should be authenticated (not 401/403)
        const passed = isAuthenticated;
        console.log(`[ComplianceEngine:Test] Valid token test ${passed ? 'PASSED' : 'FAILED'}`, {
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
          `[ComplianceEngine:Test] Invalid/no token test ${passed ? 'PASSED' : 'FAILED'}`,
          {
            endpoint,
            jwtTestScenario,
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
            : `${jwtTestScenario === 'none' ? 'Missing' : 'Invalid'} token accepted with status ${response.status}`,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = error instanceof Error && error.name === 'AbortError';

      console.error(`[ComplianceEngine:Test] Test failed with error`, {
        endpoint,
        jwtTestScenario,
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
   * Formats error message for JWT compliance test failures
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
