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
    
        this.app.get("/", async (c)  => { 
            return c.json({id: ""}, 200)
        })
    }

    async fetch(request: Request) {
        return this.app.fetch(request)
    }
}