import { Hono } from 'hono'
export {HSM} from "./do_hsm"
import { createYoga } from "graphql-yoga";
import schema from "./graphql"
import { DurableObjectNamespace } from "@cloudflare/workers-types"
type Bindings = {
    HSM: DurableObjectNamespace
}

const app = new Hono<{Bindings: Bindings}>()
  
app.use("/graphql", async (c) => {
    const yoga = createYoga({
        schema: schema,
        context: async () => ({ HSM: c.env.HSM }),
        graphqlEndpoint: "/graphql"
    });
    console.log(c);
    return yoga.handle(c.req.raw as Request, c);
});


export default app
