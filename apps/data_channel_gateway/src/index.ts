import { Hono } from 'hono'
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { stitchSchemas } from '@graphql-tools/stitch';
import { RenameRootFields, RenameTypes, schemaFromExecutor } from '@graphql-tools/wrap';
import { YogaServer, createYoga } from 'graphql-yoga';


const endpoints: {endpoint: string}[] = [
  {
    endpoint: "http://localhost:4001/graphql"
  },
  {
    endpoint: "http://localhost:4002/graphql"
  }
]

// https://github.com/ardatan/schema-stitching/blob/master/examples/combining-local-and-remote-schemas/src/gateway.ts
async function makeGatewaySchema(endpoints: {endpoint: string}[]) {
  // Make remote executors:
  // these are simple functions that query a remote GraphQL API for JSON.

  const remoteExecutors = endpoints.map (({endpoint}) => {
    return buildHTTPExecutor({
      endpoint: endpoint
      //headers: executorRequest => ({
      //  Authorization: executorRequest?.context?.authHeader,
      //}),
    })
  })
  
  const subschemas = Promise.all(remoteExecutors.map(async (exec) => {
    return {
      schema: await schemaFromExecutor(exec),
      executor: exec
    }
  }))

  return stitchSchemas({
    subschemas:  await subschemas,
    typeDefs: 'type Query { health: String! }',
    resolvers: {
      Query: {
        health: () => 'OK',
      },
    },
  });
}

// making a schema from executors requires async
// and async actions cannot be ran in the
// global space (outside of a handler) within CF
let yoga: YogaServer<{},{}> | undefined = undefined;

const app = new Hono()

app.get('/', (c) => {
  return c.json(endpoints)
})

app.use("/graphql", async (c) => {
  if (!yoga) {
    yoga = createYoga({
      schema: await makeGatewaySchema(endpoints),
    });
  }
   
  return yoga.handle(c.req.raw as Request, c);
});

export default app