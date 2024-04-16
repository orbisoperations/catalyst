import RegistrarWorker from '../src/worker';

declare module "cloudflare:test" {
  // Controls the type of `import("cloudflare:test").env`

  interface ProvidedEnv extends Env {
    DO: DurableObjectNamespace
    WORKER: Service<RegistrarWorker>
  }

  // Ensure RPC properties and methods can be accessed with `SELF`
  export const SELF: Service<import("../src/worker").default>
}
