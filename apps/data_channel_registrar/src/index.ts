import { Hono } from "hono";

import { createYoga } from "graphql-yoga";
import {schema} from "./pothos"//"./schema"
import {RegistrarState} from "./durable_object"
//import {DurableObjectNamespace} from "@cloudflare/workers-types"


type Bindings = {
    //REGISTRAR: DurableObjectNamespace
    D0_NAMESPACE: string
  }

const app = new Hono<{ Bindings: Bindings }>();


const yoga = createYoga({
  schema: schema,
  graphqlEndpoint: "/graphql",
});

app.use("/graphql", async (c) => {
  console.log(c);
  //const id = c.env.REGISTRAR.idFromName('A')
  //const obj = c.env.REGISTRAR.get(id)
  return yoga.handle(c.req.raw as Request, c);
});

app.use("/", async (c) => {
  console.log(c);
  //const id = c.env.REGISTRAR.idFromName('A')
  //const obj = c.env.REGISTRAR.get(id)
  return c.status(200)
});


export default app;