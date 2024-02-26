import { Hono } from 'hono'
import { DurableObjectState } from "@cloudflare/workers-types"

type State = string

export class Registrar {
    state: DurableObjectState
    app: Hono = new Hono()
    storedConfig: State = ""

    constructor(state: DurableObjectState ) {
        this.state = state

        this.state.blockConcurrencyWhile(async () => {
            let stored = await this.state.storage.put("test", this.state.id );
            return stored
        })

        this.app.use("/data_channel/create", async (c)  => {
            console.log("D0 get /")
            return c.json({
                req: this,
            }, 200)
        })


    }

    async fetch(request: Request) {
        return this.app.fetch(request)
    }
}
