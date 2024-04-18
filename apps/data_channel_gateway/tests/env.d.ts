declare module "cloudflare:test" {
  // Controls the type of `import("cloudflare:test").env`

  import RegistrarWorker from '@catalyst/data_channel_registrar/src/worker';

  interface ProvidedEnv extends Env {
    APP_MIGRATIONS: D1Migration[];
    TEST_SEED_MIGRATIONS: D1Migration[];
    APP_DB: D1Database;
    DATA_CHANNEL_REGISTRAR: Service<RegistrarWorker>
  }
}