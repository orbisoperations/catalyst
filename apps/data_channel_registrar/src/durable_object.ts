import { Hono } from 'hono'
import { DurableObjectState } from "@cloudflare/workers-types"

type State = string

export class RegistrarState {
  registrarState: State = ""
  d0State: DurableObjectState
  app: Hono = new Hono()

  constructor(state: DurableObjectState) {
    this.d0State = state
    this.d0State.blockConcurrencyWhile(async () => {
      return 
    })

    this.app.get('/id', async (c) => {
      return c.text(this.d0State.id.toString())
    })
  }

  async fetch(request: Request) {
    return this.app.fetch(request)
  }
}