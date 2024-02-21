import { Hono } from 'hono'
import { DurableObjectState } from "@cloudflare/workers-types"
import { createYoga } from "graphql-yoga";
import {schema} from "./pothos"

type State = string

const yoga = createYoga({
    schema: schema,
    graphqlEndpoint: "/graphql",
    context: async ({ req }) => ({
        // This part is up to you!
        D0_NAMESPACE: "dev"
    }),
});

export class RegistrarState {
    state: DurableObjectState
    app: Hono = new Hono()
    storedConfig: State = ""

    constructor(state: DurableObjectState) {
        this.state = state

        this.state.blockConcurrencyWhile(async () => {
            return
        })

        this.app.use("/graphql", async (c) => {
            console.log(c);
            return yoga.handle(c.req.raw as Request, c);
        });
    }

    async fetch(request: Request) {
        return this.app.fetch(request)
    }
}