import {Context, Hono} from 'hono'
import {stitchSchemas} from '@graphql-tools/stitch';
import {createYoga, renderGraphiQL} from 'graphql-yoga';
import { buildSchema, parse } from 'graphql';
import { isAsyncIterable, type Executor } from '@graphql-tools/utils';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {grabTokenInHeader} from "@catalyst/jwt"
import { print } from 'graphql'
import { AsyncExecutor } from '@graphql-tools/utils'
import {Env} from "./env"
import { DataChannel, DataChannelActionResponse, DataChannelId, Token } from '@catalyst/schema_zod';
import { toError } from 'graphql/jsutils/toError';
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
  console.log({execResult: result}, 'index.ts')
  return buildSchema(result.data._sdl);
}
//
// https://github.com/ardatan/schema-stitching/blob/master/examples/combining-local-and-remote-schemas/src/gateway.ts
async function makeGatewaySchema(endpoints: { endpoint: string }[], token: string) {
  console.log('makeGatewaySchema')
  const { stitchingDirectivesTransformer } = stitchingDirectives();
  // Make remote executors:
  // these are simple functions that query a remote GraphQL API for JSON.
  const remoteExecutors = endpoints.map(({endpoint}) => {
    const executor: AsyncExecutor = async ({ document, variables, operationName, extensions }) => {
      const query = print(document)
      const fetchResult = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          "Authorization": `Bearer ${token}`
          //  Authorization: executorRequest?.context?.authHeader,
        },
        body: JSON.stringify({ query, variables, operationName, extensions })
      })
      return fetchResult.json()
    }
    return executor;
  })
  //
  console.log('before promise all')
  const subschemas = Promise.all(remoteExecutors.map(async (exec) => {
    console.log("subschemas");
    return {
      schema: await fetchRemoteSchema(exec),
      executor: exec
    }
  }))
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

type Variables = {
  claims: string[]
  "catalyst-token": string
};


const app = new Hono<{ Bindings: Env & Record<string, any>, Variables: Variables  }>()
// this should be public
app.use("/.well-known/jwks.json", async (c) => {
  const jwks = await c.env.AUTHX_TOKEN_API.getPublicKeyJWK()
  console.log(jwks)
  return c.json(jwks, 200)
})

app.use(async (c, next) => {
  console.log('in da gtwy');


  const [token, error] =  grabTokenInHeader(c.req.header("Authorization"));
  if(!token) console.error({tokenError: token, error: "invalid token before createYoga"})
  else console.error('token should be working')

  if (error) {
    return c.json({
      error: error.msg
    }, error.status)
  }
  if (token == "") {
    return c.json({
      error: "JWT Invalid"
    }, 403)
  }

  const { valid, entity, claims, error:ValidError } = await c.env.AUTHX_TOKEN_API.validateToken(token)
  console.log(valid, entity, claims, error)
  if (!valid || ValidError) {
    return c.json({message: 'Token validation failed'}, 403)
  }
  c.set('claims', claims);
  c.set('catalyst-token', token)
  // we good
  await next()

  // we can add claims but do not need to enforce them here
})
app.use("/graphql", async (ctx) => {
  //console.log({context: ctx})

  const token = Token.safeParse({
    catalystToken: ctx.get("catalyst-token")
  })

  if (!token.success) {
    console.error(token.error)
    return ctx.text("invalid token", 403)
  }
  // default is used here get the default registrar
  const allDataChannels = await ctx.env.DATA_CHANNEL_REGISTRAR.list("default", token.data)

  if (!allDataChannels.success) {
    console.error(allDataChannels.error)
    return ctx.text("no resources found", 403)
  }

  const dataChannels = DataChannel.safeParse(allDataChannels.data).success
    ? [DataChannel.parse(allDataChannels.data)]
    : DataChannel.array().parse(allDataChannels.data)
  console.log({allDataChannels});
  if (!token.data.catalystToken) console.error("catalyst token is undefined when building gateway")
  const yoga = createYoga({
    schema: await makeGatewaySchema(dataChannels,  token.data.catalystToken!),
  });

  return yoga(ctx.req.raw, ctx.env);
});

export default app