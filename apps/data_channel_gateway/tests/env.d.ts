declare module "cloudflare:test" {
  // Controls the type of `import("cloudflare:test").env`

  interface ProvidedEnv extends Env {
    APP_MIGRATIONS: D1Migration[];
    TEST_SEED_MIGRATIONS: D1Migration[];
    APP_DB: D1Database;
  }
}