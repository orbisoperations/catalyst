import {Hono} from 'hono'
import {buildHTTPExecutor} from '@graphql-tools/executor-http';
import {stitchSchemas} from '@graphql-tools/stitch';
import {schemaFromExecutor} from '@graphql-tools/wrap';
import {createYoga} from 'graphql-yoga';
import {UrlqGraphqlClient} from "./client/client";

// https://github.com/ardatan/schema-stitching/blob/master/examples/stitching-directives-sdl/src/gateway.ts
async function fetchRemoteSchema(executor: Executor) {
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
async function makeGatewaySchema(endpoints: { endpoint: string }[]) {
  const { stitchingDirectivesTransformer } = stitchingDirectives();
  // Make remote executors:
  // these are simple functions that query a remote GraphQL API for JSON.

  const remoteExecutors = endpoints.map(({endpoint}) => {
    return buildHTTPExecutor({
      endpoint: endpoint
    })
  })

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

export type Env = Record<string, string> & {
  DATA_CHANNEL_REGISTRAR: Fetcher
};

const app = new Hono<{ Bindings: Env }>()

app.use("/graphql", async (ctx) => {
  const client = new UrlqGraphqlClient(ctx.env.DATA_CHANNEL_REGISTRAR);

  const allDataChannels = await client.allDataChannels();

  const yoga = createYoga({
    schema: await makeGatewaySchema(allDataChannels),
  });

  return yoga(ctx.req.raw, ctx.env);
});

export default app
