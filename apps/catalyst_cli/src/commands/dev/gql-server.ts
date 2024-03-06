/* eslint-disable perfectionist/sort-objects,perfectionist/sort-object-types */
import { serve } from '@hono/node-server'
import {Args, Command} from '@oclif/core'
import { Context, Hono } from 'hono'
import open from "open"


export default class DevGQLServer extends Command {
    static args = {
        endpoint: Args.url({description: 'data channel endpoint', required: true}),

    }

    static description = 'start a dev graphql ide'

    static examples = [
        `$ oex dev gql-server http://gatewayiporhostname:gatewayport`,
    ]

    async run(): Promise<void> {
         const {args} = await this.parse(DevGQLServer)

        const app = new Hono()
        app.all('*', async (c: Context) => {
            const res = await fetch(args.endpoint, c.req.raw)

            const resp = new Response(res.body, res)

            return resp
        })

        serve(app, (info) => {
            console.log("opening dev graphql server on:", info.address)
            open(`http://localhost:${info.port}`)
        })
    }
}