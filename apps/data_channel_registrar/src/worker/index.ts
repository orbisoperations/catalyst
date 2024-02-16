import { Hono, Context } from 'hono'
import {R2Bucket, DurableObjectNamespace} from "@cloudflare/workers-types"
import {RegistrarStateManager} from "../durable_object"

type Bindings = {
  REGISTRAR: DurableObjectNamespace
  D0_NAMESPACE: string
}

const app = new Hono<{Bindings: Bindings}>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
