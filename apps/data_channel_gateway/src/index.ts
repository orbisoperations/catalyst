import { grabTokenInHeader } from '@catalyst/jwt';
import { Token } from '@catalyst/schema_zod';
import { JWTAudience } from '@catalyst/schemas';
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
        // - Old tokens (no audience): Allow them for backwards compatibility
        // - New tokens (with audience): Only allow 'catalyst:gateway' audience
        if (audience && audience !== JWTAudience.enum['catalyst:gateway']) {
            return { valid: false, error: 'Token audience is not valid for gateway access' };
        }

        return { valid: true, audience }; // audience is either 'catalyst:gateway' or undefined
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
            const token = Token.safeParse(request);

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
                    error: audienceValidation.error,
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
 * Middleware to authenticate requests
 * TODO: separate this into a separate file, with better logic
 *
 * Separating into its own handler fixes a weird case where app.use does a app.all('*', for all routes, and we only need auth for /graphql
 * Use in specific routes that need auth
 *
 * @param c - The context object
 * @param next - The next middleware function
 * @returns A JSON response with an error message if the token is invalid
 */
const authenticateRequestMiddleware = async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const [token, error] = grabTokenInHeader(c.req.header('Authorization'));
    if (error) {
        return c.json(
            {
                error: error.msg,
            },
            400
        );
    }
    if (!token) {
        return c.json(
            {
                error: 'JWT Invalid',
            },
            403
        );
    }

    // Check audience only - let registrar handle full JWT validation
    const audienceValidation = validateGatewayAudience(token);
    if (!audienceValidation.valid) {
        return c.json({ message: audienceValidation.error }, 403);
    }

    // For middleware, we still need to do full validation to get claims and check revocation
    const { valid, claims, jwtId, error: ValidError } = await c.env.AUTHX_TOKEN_API.validateToken(token);
    if (!valid || ValidError || !jwtId) {
        return c.json({ message: 'Token validation failed' }, 403);
    }

    // Check if the JWT token is invalid (revoked or deleted)
    if (await c.env.ISSUED_JWT_REGISTRY.isInvalid(jwtId)) {
        return c.json({ message: 'Token has been revoked' }, 403);
    }

    c.set('claims', claims);
    c.set('catalyst-token', token);
    // we good
    await next();

    // we can add claims but do not need to enforce them here
};

app.use('/graphql', authenticateRequestMiddleware, async (ctx) => {
    const token = Token.safeParse({
        catalystToken: ctx.get('catalyst-token'),
    });

    if (!token.success) {
        console.error(token.error);
        return ctx.json(
            {
                error: 'invalid token',
            },
            403
        );
    }
    if (!token.data.catalystToken) console.error('catalyst token is undefined when building gateway');
    const claims = ctx.get('claims');
    if (!claims) {
        console.error('no claims found');
        return ctx.json(
            {
                error: 'no claims found',
            },
            403
        );
    }

    const channelAccessPermissions = await ctx.env.AUTHX_TOKEN_API.splitTokenIntoSingleUseTokens(
        token.data.catalystToken!,
        'default'
    );

    if (!channelAccessPermissions.success) {
        return ctx.json(
            {
                error: channelAccessPermissions.error,
            },
            403
        );
    }

    // filter out failed signed tokens
    // map to endpoints
    const endpoints = channelAccessPermissions.channelPermissions
        .filter((dataChannelPermission) => dataChannelPermission.success)
        .map(({ dataChannel, singleUseToken }) => ({
            token: singleUseToken,
            endpoint: dataChannel.endpoint,
        }));

    const yoga = createYoga({
        schema: await makeGatewaySchema(endpoints),
    });

    // @ts-expect-error: for some reason TS is not happy with the yoga function receiving the raw request
    // ignore for now, fix later
    return yoga(ctx.req.raw, ctx.env);
});

export default app;
