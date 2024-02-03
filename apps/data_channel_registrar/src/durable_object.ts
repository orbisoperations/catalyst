import { Hono } from 'hono'
import { DurableObjectState } from "@cloudflare/workers-types"

type State = string

export class RegistrarState {
    state: DurableObjectState
    app: Hono = new Hono()
    storedConfig: State = ""

    constructor(state: DurableObjectState) {
        this.state = state

        this.state.blockConcurrencyWhile(async () => {
            return
        })
    
        this.app.use("/health", async (c)  => { 
            console.log("D0 get /")
            return c.json({
                id: this.state.id,
            }, 200)
        })


    }

    async fetch(request: Request) {
        return this.app.fetch(request)
    }
}