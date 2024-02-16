import { Hono } from "hono";

import { createYoga } from "graphql-yoga";
import {schema} from "./pothos"//"./schema"
export  {RegistrarState} from "./durable_object"
import {DurableObjectNamespace} from "@cloudflare/workers-types"


type Bindings = {
    REGISTRAR: DurableObjectNamespace
    D0_NAMESPACE: string
  }

const app = new Hono<{ Bindings: Bindings }>();


const yoga = createYoga({
  schema: schema,
  graphqlEndpoint: "/graphql",
});

app.use("/graphql", async (c) => {
  console.log(c);
  const id = c.env.REGISTRAR.idFromName('A')
  const obj = c.env.REGISTRAR.get(id)
  return yoga.handle(c.req.raw as Request, c);
});

app.use("/", async (c) => {
  console.log(c);
  const id = c.env.REGISTRAR.idFromName('A')
  const obj = c.env.REGISTRAR.get(id)
  const resp = await obj.fetch("http://d0.com/id")
  
  return c.text(await resp.text(), 200)
});


export default app;