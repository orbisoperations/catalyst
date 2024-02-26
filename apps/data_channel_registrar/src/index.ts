import { Context, Hono } from "hono";
import { createYoga } from "graphql-yoga";
import { schema } from "./schema";
import {DurableObjectNamespace} from "@cloudflare/workers-types"
import { env } from "hono/adapter";

// this is needed for wrangler to see and create the D0
export  {RegistrarState} from "./durable_object"

type Bindings = {
    REGISTRAR: DurableObjectNamespace
    D0_NAMESPACE: string
  }

const app = new Hono<{ Bindings: Bindings }>();

const yoga = createYoga({
  schema: schema,
  graphqlEndpoint: "/graphql"
});

app.use("/health", async (c) => {
  const id = c.env.REGISTRAR.newUniqueId()
  const obj = c.env.REGISTRAR.get(id)

  console.log("fetching D0")
  const resp = await obj.fetch("http://whatever.com/health", {
    method: "GET"
  })

  const jsonResp = await resp.json()
  console.log(jsonResp)

  return c.json(jsonResp, 200)
})

app.use("/health/worker", async (c) => {

})

app.use("/health/d0", async (c) => {
  console.log(c);
  const id = c.env.REGISTRAR.idFromName('A')
  const obj = c.env.REGISTRAR.get(id)

  console.log("fetching D0")
  const resp = await obj.fetch("http://d0.com/health", {
    method: "GET"
  })

  const jsonResp = await resp.json()
  console.log(jsonResp)

  return c.json(jsonResp, 200)
})

app.use("/graphql", async (c) => {
  console.log(c);
  const id = c.env.REGISTRAR.idFromName('A')
  const obj = c.env.REGISTRAR.get(id)
  return yoga.handle(c.req.raw as Request, c);
});

export default app;
