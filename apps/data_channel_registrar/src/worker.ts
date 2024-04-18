import {Hono} from 'hono';
import {DurableObjectNamespace} from "@cloudflare/workers-types"
import {createYoga} from "graphql-yoga";
import schemaBuilder from "./pothos/schemaBuilder.js";
export {Registrar} from "./do.js"

export type Env = Record<string, string> & {
  DO: DurableObjectNamespace;
};
const app = new Hono<{ Bindings: Env }>();



app.use('/graphql', async (ctx) => {
  const yoga = createYoga({
    schema: schemaBuilder,
    context: async () => ({
      env: {
        DONamespace: ctx.env.DO
      }
    }),
    graphqlEndpoint: '/graphql'
  });

  return  yoga.handle(ctx.req.raw, {
    env: {
      DONamespace: ctx.env.DO,
    }
  });
});

export default app;
