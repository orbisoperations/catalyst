import { Hono } from 'hono'
export {HSM} from "./do_hsm"
import { createYoga } from "graphql-yoga";

const app = new Hono()

const yoga = createYoga({
    schema: schema,
    context: async () => ({ DB: process.env.DB }),
    graphqlEndpoint: "/graphql"
  });
  
  app.use("/graphql", async (c) => {
    console.log(c);
    return yoga.handle(c.req.raw as Request, c);
  });


export default app
