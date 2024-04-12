import {Hono} from 'hono';
import {DataChannel} from "./pothos/schemaBuilder"

export  class Registrar {
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

        this.app.get("/:id", async (c) => {
            //TODO: implement claims
            // const {claims} = await c.req.json<{claims?: string[]}>()
            const {id} = c.req.param()

            const dataChannel: DataChannel | undefined = await this.state.storage.get(id);

            if (dataChannel) {
                return c.json(dataChannel, 200)
            }
            return c.json(`No data channel found: ${id}`, 500);
            //TODO: implement claims
            // if (claims && dataChannel) {
            //     const filtered = claims.includes(dataChannel.id)
            //     return c.json(filtered,
            //         200)
            // } else {
            //     return c.json(`No data channel found: ${id}`, 500)
            // }
        })



        // this handles create and update for a data channel
        this.app.post("/create", async (c) => {
            const datachannel = await c.req.json<DataChannel>()
            datachannel.id = crypto.randomUUID();
            this.state.storage.put(datachannel.id, datachannel)
            return c.json( datachannel.id, 200)
        })

        this.app.post("/update", async (c) => {
            const datachannel = await c.req.json<DataChannel>()
            this.state.storage.put(datachannel.id, datachannel)
            return c.json(datachannel.id, 200)
        })

        // this.app.delete("/delete", async (c) => {
        //     const {id} = c.req.param(id)
        //     this.state.storage.delete(id)
        //     return c.status(200)
        // })



    }
    async fetch(request: Request) {
        return this.app.fetch(request)
    }
}

export default <ExportedHandler<Env>>{
    fetch(request, env) {
        const { pathname } = new URL(request.url);
        const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName("org_id");
        const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id);
        return stub.fetch(request);
    },
};
