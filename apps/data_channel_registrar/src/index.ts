import { Context, Hono } from "hono";
import { createYoga } from "graphql-yoga";
import { D1Database} from "@cloudflare/workers-types"
import schema from "./DataChannel"
import { env } from "hono/adapter";
import { DataChannel } from './DataChannel'

type Bindings = {
  DB: D1Database
  }

const app = new Hono<{ Bindings: Bindings }>();
const yoga = createYoga({
  schema: schema,
  context: async () => ({ DB: process.env.DB }),
  graphqlEndpoint: "/graphql"
});

app.use("/graphql", async (c) => {
  console.log(c);
  return yoga.handle(c.req.raw as Request, c);
});

export default app;
