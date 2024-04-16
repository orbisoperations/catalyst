declare module "cloudflare:test" {
  // Controls the type of `import("cloudflare:test").env`

  interface ProvidedEnv extends Env{
    DO: DurableObjectNamespace
  }

  // Ensure RPC properties and methods can be accessed with `SELF`
  // @ts-ignore
  export const SELF: Service<import("../src/worker").default>
}
