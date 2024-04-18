import { Env } from "hono";

declare module "cloudflare:test" {
  // Controls the type of `import("cloudflare:test").env`

  interface ProvidedEnv extends Env {
    DATA_CHANNEL_REGISTRAR_DO: DurableObjectNamespace
  }
}
