import {Context, Hono} from 'hono'
import {stitchSchemas} from '@graphql-tools/stitch';
import {schemaFromExecutor} from '@graphql-tools/wrap';
import {createYoga, renderGraphiQL} from 'graphql-yoga';
import {UrlqGraphqlClient} from "./client/client";
import { buildSchema, parse } from 'graphql';
import { isAsyncIterable, type Executor } from '@graphql-tools/utils';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {grabTokenInHeader} from "@catalyst/jwt"
import { print } from 'graphql'
import { AsyncExecutor } from '@graphql-tools/utils'
import {Env} from "./env"
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
async function makeGatewaySchema(endpoints: { endpoint: string }[], token?: string) {
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
          "Authorization": token ?? ""
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
};


const app = new Hono<{ Bindings: Env & Record<string, any>, Variables: Variables  }>()
app.use(async (c, next) => {
  console.log('in da gtwy');

  const [token, error] =  grabTokenInHeader(c.req.header("Authorization"));

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

  const client = new UrlqGraphqlClient(c.env.AUTHX_TOKEN_API);
  const [validate, claims] = await client.validateToken(token);


  c.set('claims', claims);

  if (!validate) {
    return c.json({message: 'Token validation failed'}, 403)
  }


  // we good
  await next()

  // we can add claims but do not need to enforce them here
})
app.use("/graphql", async (ctx) => {
  const client = new UrlqGraphqlClient(ctx.env.DATA_CHANNEL_REGISTRAR);
  console.log({context: ctx})

  const recievedClaims = ctx.get('claims');

  console.error({recievedClaims});
  // default is used here get the default registrar
  const allDataChannels = await ctx.env.DATA_CHANNEL_REGISTRAR.list("default", ctx.get('claims') ?? [])

  console.log({allDataChannels});
  const token =  ctx.req.header('Authorization');
  if(!token) console.error({tokenError: token, error: "invalid token before createYoga"})
  else console.error('token should be working', token)
  console.log({tokenInReq: ctx.req.header('Authorization')});
  const yoga = createYoga({
    schema: await makeGatewaySchema(allDataChannels,  token),
  });

  return yoga(ctx.req.raw, ctx.env);
});

export default app