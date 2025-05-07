import { grabTokenInHeader } from '@catalyst/jwt';
import { Token } from '@catalyst/schema_zod';
import { stitchSchemas } from '@graphql-tools/stitch';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { AsyncExecutor, isAsyncIterable, type Executor } from '@graphql-tools/utils';
import { buildSchema, parse, print } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { Hono } from 'hono';
import { Env } from './env';
import { Variables } from './types';
import { generateSingleUseCatalystTokens } from './tokenGenerators';

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
export async function makeGatewaySchema(endpointsInfo: { endpoint: string; singleUseToken: string }[]) {
    console.log('makeGatewaySchema');

    const { stitchingDirectivesTransformer } = stitchingDirectives();
    // Make remote executors:
    // these are simple functions that query a remote GraphQL API for JSON.
    const remoteExecutors = endpointsInfo.map(({ endpoint, singleUseToken }) => {
        // generate a single use token for the data channel
        const executor: AsyncExecutor = async ({ document, variables, operationName, extensions }) => {
            const query = print(document);
            const fetchResult = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${singleUseToken}`,
                    //  Authorization: executorRequest?.context?.authHeader,
                },
                body: JSON.stringify({ query, variables, operationName, extensions }),
            });
            return fetchResult.json();
        };
        return executor;
    });
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
                .filter((result) => result.status === 'fulfilled')
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
//

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
    if (!valid || ValidError) {
        return c.json({ message: 'Token validation failed' }, 403);
    }

    if (!jwtId && !(await c.env.JWT_REGISTRY.isOnRevocationList(jwtId))) {
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
    const dataChannelsSingleUseTokens = await generateSingleUseCatalystTokens(claims, token.data.catalystToken!, ctx);
    if (!dataChannelsSingleUseTokens.success) {
        return ctx.json(
            {
                error: 'not resources found',
            },
            403
        );
    }
    const yoga = createYoga({
        schema: await makeGatewaySchema(dataChannelsSingleUseTokens.data),
    });

    // @ts-expect-error: for some reason TS is not happy with the yoga function receiving the raw request
    // ignore for now, fix later
    return yoga(ctx.req.raw, ctx.env);
});

export default app;
