/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module 'cloudflare:test' {
  // ProvidedEnv controls the type of `import("cloudflare:test").env`
  interface ProvidedEnv extends Env {}
}
