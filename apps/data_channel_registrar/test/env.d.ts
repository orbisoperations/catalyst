declare module "cloudflare:test" {
  // Controls the type of `import("cloudflare:test").env`

  interface ProvidedEnv extends Env {
    DO: DurableObjectNamespace<import("../src/worker").Registrar>
    AUTHZED: Service<import("../../authx_authzed_api/src").default>;
    AUTHX_TOKEN_API: Service<import("../../authx_token_api/src").default>;
    USERCACHE: Service<import("../../user_credentials_cache/src").default>;
    CACHE: DurableObjectNamespace<import("../../user_credentials_cache/src").UserCredsCache>;
  }

  // Ensure RPC properties and methods can be accessed with `SELF`
  export const SELF: Service<import("../src/worker").default>
}