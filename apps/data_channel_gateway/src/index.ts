import { grabTokenInHeader } from '@catalyst/jwt';
import { TokenSchema, JWTAudience } from '@catalyst/schemas';
import { decodeJwt } from 'jose';
import { stitchSchemas } from '@graphql-tools/stitch';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { AsyncExecutor, isAsyncIterable, type Executor } from '@graphql-tools/utils';
import { buildSchema, parse, print } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { Context, Hono, Next } from 'hono';
import { Env } from './env';

export type ValidateTokenRequest = {
    claimId: string;
    catalystToken: string;
};

export type ValidateTokenResponse = {
    claimId: string;
    catalystToken: string;
    valid: boolean;
    error: string;
};

// // https://github.com/ardatan/schema-stitching/blob/master/examples/stitching-directives-sdl/src/gateway.ts
export async function fetchRemoteSchema(executor: Executor) {
    const result = await executor({
        document: parse(/* GraphQL */ `
            {
                _sdl
            }
        `),
    });
    if (isAsyncIterable(result)) {
        throw new Error('Expected executor to return a single result');
    }
    return buildSchema(result.data._sdl);
}

// https://github.com/ardatan/schema-stitching/blob/master/examples/combining-local-and-remote-schemas/src/gateway.ts
export async function makeGatewaySchema(
    endpoints: { token: string; endpoint: string }[],
    options?: { timeoutMs?: number }
) {
    console.log('makeGatewaySchema');

    const { stitchingDirectivesTransformer } = stitchingDirectives();

    // Use provided timeout or default to 10 seconds
    const timeoutMs = options?.timeoutMs ?? 10000;

    // Make remote executors:
    // these are simple functions that query a remote GraphQL API for JSON.
    const remoteExecutors = endpoints
        .map(({ endpoint, token }) => {
            const executor: AsyncExecutor = async ({ document, variables, operationName, extensions }) => {
                const query = print(document);

                // Create a timeout promise that rejects after the specified timeout
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Timeout: Request to ${endpoint} took longer than ${timeoutMs}ms`));
                    }, timeoutMs);
                });

                // Create the fetch promise
                const fetchPromise = fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ query, variables, operationName, extensions }),
                });

                // Race between fetch and timeout
                const fetchResult = await Promise.race([fetchPromise, timeoutPromise]);

                if (fetchResult.status >= 400) {
                    console.error('error fetching remote schema:', fetchResult.status);
                    throw new Error(`error fetching remote schema: ${endpoint} Status:${fetchResult.status}`);
                }
                const responseText = await fetchResult.text();
                try {
                    return JSON.parse(responseText);
                } catch (e) {
                    console.error(`error parsing JSON: ${JSON.stringify(e, null, 4)}`);
                    throw new Error(`Failed to parse JSON response from ${endpoint}. Response: ${responseText}`);
                }
            };
            return executor;
        })
        .filter((executor) => executor !== null);
    //
    console.log('before promise all');
    const subschemas = Promise.allSettled(
        remoteExecutors.map(async (exec) => {
            return {
                schema: await fetchRemoteSchema(exec),
                executor: exec,
            };
        })
    ).then((results) => {
        // Filter out failed producers and only use successful ones
        return (
            results
                .filter((result) => {
                    if (result.status === 'fulfilled') {
                        return true;
                    }
                    // added for tracing on CF observability
                    console.error('error fetching remote schema:', result.reason);
                    return false;
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((result) => (result as PromiseFulfilledResult<any>).value)
        );
    });
    return stitchSchemas({
        subschemas: await subschemas,
        subschemaConfigTransforms: [stitchingDirectivesTransformer],
        typeDefs: 'type Query { health: String! }',
        resolvers: {
            Query: {
                health: () => 'OK',
            },
        },
    });
}

export type Variables = {
    claims: string[];
    'catalyst-token': string;
};

const app = new Hono<{
    Bindings: Env;
    Variables: Variables;
}>();

// this should be public
app.get('/.well-known/jwks.json', async (c) => {
    const jwks = await c.env.AUTHX_TOKEN_API.getPublicKeyJWK();
    return c.json(jwks, 200);
});

const validateGatewayAudience = (token: string) => {
    try {
        const payload = decodeJwt(token); // No signature validation, just decode
        const audience = payload.aud;

        // Audience validation - only allow gateway tokens
        if (audience !== JWTAudience.enum['catalyst:gateway']) {
            return { valid: false, error: 'Token audience is not valid for gateway access' };
        }

        return { valid: true, audience };
    } catch {
        return { valid: false, error: 'Invalid token format' };
    }
};

// Add bulk validation endpoint
app.post('/validate-tokens', async (ctx) => {
    const requests = await ctx.req.json();

    if (!Array.isArray(requests)) {
        return ctx.json(
            {
                error: 'request body must be an array',
            },
            400
        );
    }

    const results = await Promise.all(
        requests.map(async (request: ValidateTokenRequest): Promise<ValidateTokenResponse> => {
            const token = TokenSchema.safeParse(request);

            if (!token.success || !token.data.catalystToken) {
                return {
                    claimId: request.claimId,
                    catalystToken: request.catalystToken,
                    valid: false,
                    error: 'invalid token',
                };
            }

            // Check audience only - let registrar handle full JWT validation
            const audienceValidation = validateGatewayAudience(token.data.catalystToken);
            if (!audienceValidation.valid) {
                return {
                    claimId: request.claimId,
                    catalystToken: request.catalystToken,
                    valid: false,
                    error: audienceValidation.error || 'invalid audience',
                };
            }

            const dataChannels = await ctx.env.DATA_CHANNEL_REGISTRAR.list('default', {
                catalystToken: token.data.catalystToken,
            });

            if (!dataChannels.success) {
                return {
                    claimId: request.claimId,
                    catalystToken: request.catalystToken,
                    valid: false,
                    error: 'failed to fetch data channels',
                };
            }

            const dataChannelsArray = Array.isArray(dataChannels.data) ? dataChannels.data : [dataChannels.data];
            if (dataChannelsArray.length === 0) {
                return {
                    claimId: request.claimId,
                    catalystToken: request.catalystToken,
                    valid: false,
                    error: 'no data channels found for token',
                };
            }

            // check if claimId is in dataChannels
            const dataChannel = dataChannelsArray.find((channel) => channel.id === request.claimId);
            if (!dataChannel) {
                return {
                    claimId: request.claimId,
                    catalystToken: request.catalystToken,
                    valid: false,
                    error: `data channel '${request.claimId}' not found in available channels`,
                };
            }

            return {
                claimId: request.claimId,
                catalystToken: request.catalystToken,
                valid: true,
                error: '',
            };
        })
    );

    return ctx.json(results, 200);
});

/**
 * Helper to create a GraphQL Yoga instance with the gateway schema
 * @param endpoints - Array of data channel endpoints with single-use tokens
 * @returns Configured Yoga instance
 */
const createGatewayYoga = async (endpoints: { token: string; endpoint: string }[]) => {
    return createYoga({
        schema: await makeGatewaySchema(endpoints),
        maskedErrors: {
            maskError: (error) => {
                // Suppress "Cannot query field" errors - these happen when users query
                // fields from channels they don't have access to
                if (error.message.includes('Cannot query field')) {
                    // Return the original error unchanged - GraphQL will handle it
                    return error;
                }
                // Log and pass through all errors
                console.warn('GraphQL error suppressed:', error.message);
                // Return the original error - GraphQL Yoga handles masking
                return error;
            },
        },
    });
};

/**
 * Helper to execute a Yoga GraphQL instance with Hono context
 * Uses yoga.fetch(request, env) pattern recommended by Hono + GraphQL Yoga integration
 * @param yoga - The Yoga GraphQL instance to execute
 * @param ctx - The Hono context object
 * @returns The response from the Yoga instance
 */
const executeYogaWithContext = (
    yoga: ReturnType<typeof createYoga>,
    ctx: Context<{ Bindings: Env; Variables: Variables }>
) => {
    // Yoga's fetch() expects (Request, env) - see https://github.com/orgs/honojs/discussions/1063
    // Type definitions don't align with Hono's context, but works correctly at runtime
    // @ts-expect-error - Expected type mismatch between Yoga and Hono context types
    return yoga(ctx.req.raw, ctx.env);
};

/**
 * Middleware to authenticate requests
 *
 * This middleware extracts and validates tokens but does NOT return error responses.
 * Instead, it sets empty claims/tokens on validation failure, allowing the gateway
 * to return an empty schema (best-effort stitching approach).
 *
 * @param c - The context object
 * @param next - The next middleware function
 */
const authenticateRequestMiddleware = async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const [token, error] = grabTokenInHeader(c.req.header('Authorization'));
    if (error) {
        console.warn('Token extraction error:', error.msg);
        c.set('claims', []);
        c.set('catalyst-token', '');
        await next();
        return;
    }
    if (!token) {
        console.warn('No token provided');
        c.set('claims', []);
        c.set('catalyst-token', '');
        await next();
        return;
    }

    const { valid, claims, jwtId, error: ValidError } = await c.env.AUTHX_TOKEN_API.validateToken(token);
    if (!valid || ValidError || !jwtId) {
        console.warn('Token validation failed:', ValidError);
        c.set('claims', []);
        c.set('catalyst-token', '');
        await next();
        return;
    }

    // Check if the JWT token is invalid (revoked or deleted)
    if (await c.env.ISSUED_JWT_REGISTRY.isInvalid(jwtId)) {
        console.warn('Token has been revoked:', jwtId);
        c.set('claims', []);
        c.set('catalyst-token', '');
        await next();
        return;
    }

    c.set('claims', claims);
    c.set('catalyst-token', token);
    await next();
};

app.use('/graphql', authenticateRequestMiddleware, async (ctx) => {
    // Auth guard: Validate token schema
    const token = TokenSchema.safeParse({
        catalystToken: ctx.get('catalyst-token'),
    });
    if (!token.success) {
        // Expected auth failure - client provided invalid token format
        console.info('Invalid token format, returning empty schema');
        const yoga = await createGatewayYoga([]);
        return executeYogaWithContext(yoga, ctx);
    }

    // Auth guard: Verify claims exist
    const claims = ctx.get('claims');
    if (!claims || claims.length === 0) {
        // Expected auth failure - no claims found (handled by auth middleware)
        console.info('No claims found, returning empty schema');
        const yoga = await createGatewayYoga([]);
        return executeYogaWithContext(yoga, ctx);
    }

    // Auth guard: Split token into single-use tokens
    const channelAccessPermissions = await ctx.env.AUTHX_TOKEN_API.splitTokenIntoSingleUseTokens(
        token.data.catalystToken,
        'default'
    );
    if (!channelAccessPermissions.success) {
        // System issue - token splitting failed
        console.warn('Failed to split token into single-use tokens, returning empty schema');
        const yoga = await createGatewayYoga([]);
        return executeYogaWithContext(yoga, ctx);
    }

    // Filter successful channel permissions and map to endpoints
    // Type guard: filter ensures only success cases, then we can safely access dataChannel
    const endpoints = channelAccessPermissions.channelPermissions
        .filter((permission): permission is Extract<typeof permission, { success: true }> => {
            if (!permission.success) {
                // Expected - individual channel permission failed
                console.info('Skipping failed channel permission');
                return false;
            }
            return true;
        })
        .map(({ dataChannel, singleUseToken }) => ({
            token: singleUseToken,
            endpoint: dataChannel.endpoint,
        }));

    if (endpoints.length === 0) {
        console.info('No accessible channels, returning empty schema with health query only');
    }

    const yoga = await createGatewayYoga(endpoints);
    return executeYogaWithContext(yoga, ctx);
});

export default app;
