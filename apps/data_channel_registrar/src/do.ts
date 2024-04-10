import {Hono} from 'hono';
import {DataChannel} from "./pothos/schemaBuilder.js"



export class Registrar {
    state: DurableObjectState
    app: Hono = new Hono()

    constructor(state: DurableObjectState) {
        this.state = state
        /*this.state.blockConcurrencyWhile(async () => {
            const stored = await this.state.storage?.get<number>('value')
            this.value = stored || 0
        })*/

        // get all and filter case
        this.app.get("/list", async (c) => {
            const dataChannels = Array.from((await this.state.storage.list<DataChannel>()).values())
            return c.json( dataChannels, 200)
        })

        this.app.post("/list", async (c) => {
            const {claims} = await c.req.json<{claims?: string[]}>()
            const dataChannels = Array.from((await this.state.storage.list<DataChannel>()).values())
            if (claims) {
                const filtered = dataChannels.filter((dataChannel) => {
                    return claims.includes(dataChannel.name)
                })
                return c.json(filtered,
                    200)
            } else {
                return c.json([], 200)
            }
        })

        // this handles create and update for a data channel
        this.app.post("/create", async (c) => {
            const datachannel = await c.req.json<DataChannel>()
            this.state.storage.put(datachannel.id, datachannel)
            return c.json({ id: datachannel.id}, 200)
        })

        this.app.post("/update", async (c) => {
            const datachannel = await c.req.json<DataChannel>()
            this.state.storage.put(datachannel.id, datachannel)
            return c.json(datachannel.id, 200)
        })

        this.app.delete("/:id", async (c) => {
            const {id} = c.req.param()
            this.state.storage.delete(id)
            return c.status(200)
        })



    }
    async fetch(request: Request) {
        return this.app.fetch(request)
    }
}




