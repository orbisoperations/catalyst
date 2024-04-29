declare module "cloudflare:test" {
  // Controls the type of `import("cloudflare:test").env`

  import RegistrarWorker, {Registrar} from '@catalyst/data_channel_registrar/src/worker';
  import AuthzedWorker from "@catalyst/authx_authzed_api/src";
  import JWTWorker from "@catalyst/authx_token_api/src/index";

  interface ProvidedEnv extends Env {
    APP_MIGRATIONS: D1Migration[];
    TEST_SEED_MIGRATIONS: D1Migration[];
    APP_DB: D1Database;
    DATA_CHANNEL_REGISTRAR: Service<RegistrarWorker>
    DATA_CHANNEL_REGISTRAR_DO: DurableObjectNamespace<Registrar>
    AUTHX_AUTHZED_API: Service<AuthzedWorker>
    AUTHX_TOKEN_API: Service<JWTWorker>
  }
}
