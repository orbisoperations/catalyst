import { Hono } from "hono";
import { DurableObjectState } from "@cloudflare/workers-types"


type State = Object


export class RegistrarStateManager {
    doState: DurableObjectState
    app: Hono = new Hono()
    appState: State = new Object();

    constructor(doState: DurableObjectState) {
        this.doState = doState

        this.doState.blockConcurrencyWhile(async () => {
            // hydrate this.appState
        })
    
        this.app.get("/id", async (c)  => { 
            return c.json({"id": doState.id.toString()})
            
        })
    }

    async fetch(request: Request) {
        // this calls the hono API so we can make this a REST API
        // we could also turn this into a Message and return an awswer based on
        // making operations on state directly
        return this.app.fetch(request)
    }
}