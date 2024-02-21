import { Context, Hono } from "hono";
import {DurableObjectNamespace} from "@cloudflare/workers-types"

// this is needed for wrangler to see and create the D0
export  {RegistrarState} from "./durable_object"



type Bindings = {
    REGISTRAR: DurableObjectNamespace
    D0_NAMESPACE: string
  }

const app = new Hono<{ Bindings: Bindings }>();

app.use("/graphql", async (c) => {
  console.log(c);
  const id = c.env.REGISTRAR.idFromName('A')
  const obj = c.env.REGISTRAR.get(id)

  return obj.fetch(c.req.raw as Request)
});

export default app;