import {Hono} from 'hono'
import {stitchSchemas} from '@graphql-tools/stitch';
import {schemaFromExecutor} from '@graphql-tools/wrap';
import {createYoga} from 'graphql-yoga';
import {UrlqGraphqlClient} from "./client/client";
import { buildSchema, parse } from 'graphql';
import { isAsyncIterable, type Executor } from '@graphql-tools/utils';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {grabTokenInHeader} from "@catalyst/jwt"
//
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
//
// https://github.com/ardatan/schema-stitching/blob/master/examples/combining-local-and-remote-schemas/src/gateway.ts
async function makeGatewaySchema(endpoints: { endpoint: string }[]) {
  const { stitchingDirectivesTransformer } = stitchingDirectives();
  // Make remote executors:
  // these are simple functions that query a remote GraphQL API for JSON.

  const { buildHTTPExecutor} = await import('@graphql-tools/executor-http')


  const remoteExecutors = endpoints.map(({endpoint}) => {
    return buildHTTPExecutor({
      endpoint: endpoint
      //headers: executorRequest => ({
      //  Authorization: executorRequest?.context?.authHeader,
      //}),
    })
  })
  //
  const subschemas = Promise.all(remoteExecutors.map(async (exec) => {
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

console.error('this will make the logs actually output')

type Variables = {
  claims: string[]
};


const app = new Hono<{ Bindings: Env & Record<string, any>, Variables: Variables  }>()
app.use(async (c, next) => {


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
  console.log({claims});

  c.set('claims', claims);

  if (!validate) {
    return c.text("GF'd", 403)
  }


  // we good
  await next()

  // we can add claims but do not need to enforce them here
})
app.use("/graphql", async (ctx) => {
  const client = new UrlqGraphqlClient(ctx.env.DATA_CHANNEL_REGISTRAR);

  /* e.g
    claims: [dc1, dc3]
    data channels returned: [ dc1, dc3 ]
   */
  const allDataChannels = await client.allDataChannelsByClaims(
      //JSON.parse(ctx.req.header('x-catalyst-claims') as string)
      ctx.get('claims') ?? []
  );

  const yoga = createYoga({
    schema: await makeGatewaySchema(allDataChannels),
  });

  return yoga(ctx.req.raw, ctx.env);
});

export default app