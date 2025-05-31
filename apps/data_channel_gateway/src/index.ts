import { grabTokenInHeader } from '@catalyst/jwt';
import { Token } from '@catalyst/schema_zod';
import { stitchSchemas } from '@graphql-tools/stitch';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { AsyncExecutor, isAsyncIterable, type Executor } from '@graphql-tools/utils';
import { buildSchema, parse, print } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { Hono } from 'hono';
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
    // throw new Error();
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
export async function makeGatewaySchema(endpoints: { token: string; endpoint: string }[]) {
    console.log('makeGatewaySchema');

    const { stitchingDirectivesTransformer } = stitchingDirectives();
    // Make remote executors:
    // these are simple functions that query a remote GraphQL API for JSON.
    const remoteExecutors = endpoints
        .map(({ endpoint, token }) => {
            const executor: AsyncExecutor = async ({ document, variables, operationName, extensions }) => {
                const query = print(document);
                const fetchResult = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                        //  Authorization: executorRequest?.context?.authHeader,
                    },
                    body: JSON.stringify({ query, variables, operationName, extensions }),
                });
                return fetchResult.json();
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
app.use('/.well-known/jwks.json', async (c) => {
    const jwks = await c.env.AUTHX_TOKEN_API.getPublicKeyJWK();
    console.log(jwks);
    return c.json(jwks, 200);
});

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

app.use(async (c, next) => {
    console.log('in da gtwy');

    const [token, error] = grabTokenInHeader(c.req.header('Authorization'));
    if (!token)
        console.error({
            tokenError: token,
            error: 'invalid token before createYoga',
        });
    else console.error('token should be working');

    if (error) {
        return c.json(
            {
                error: error.msg,
            },
            // @ts-expect-error:  Argument of type 'StatusCode' is not assignable to parameter of type 'ContentfulStatusCode | undefined'.
            //                    Type '101' is not assignable to type 'ContentfulStatusCode | undefined'.‘
            error.status
        );
    }
    if (token == '') {
        return c.json(
            {
                error: 'JWT Invalid',
            },
            403
        );
    }

    const { valid, entity, claims, jwtId, error: ValidError } = await c.env.AUTHX_TOKEN_API.validateToken(token);
    console.log(valid, entity, claims, jwtId, error);
    if (!valid || ValidError || !jwtId) {
        return c.json({ message: 'Token validation failed' }, 403);
    }

    // if token is not on the revocation list, this function will return false
    // else it checks the status agains ENUM.revoked
    if (await c.env.ISSUED_JWT_REGISTRY.isOnRevocationList(jwtId)) {
        return c.json({ message: 'Token has been revoked' }, 403);
    }

    c.set('claims', claims);
    c.set('catalyst-token', token);
    // we good
    await next();

    // we can add claims but do not need to enforce them here
});

app.use('/graphql', async (ctx) => {
    //console.log({context: ctx})
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
