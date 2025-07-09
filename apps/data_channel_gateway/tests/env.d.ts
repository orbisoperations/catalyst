declare module 'cloudflare:test' {
    // Controls the type of `import("cloudflare:test").env`

    import AuthzedWorker from '@catalyst/authx_authzed_api/src';
    import JWTWorker, { JWTKeyProvider } from '@catalyst/authx_token_api/src';
    import RegistrarWorker, { Registrar } from '@catalyst/data_channel_registrar/src/worker';
    import JWTRegistry, { I_JWT_Registry_DO } from '@catalyst/issued-jwt-registry/src';

    // @ts-expect-error Env is extended (but not exported) as a part of the vitest integration
    interface ProvidedEnv extends Env {
        APP_MIGRATIONS: D1Migration[];
        TEST_SEED_MIGRATIONS: D1Migration[];
        APP_DB: D1Database;
        DATA_CHANNEL_REGISTRAR: Service<RegistrarWorker>;
        DATA_CHANNEL_REGISTRAR_DO: DurableObjectNamespace<Registrar>;
        AUTHX_AUTHZED_API: Service<AuthzedWorker>;
        AUTHX_TOKEN_API: Service<JWTWorker>;
        JWT_TOKEN_DO: DurableObjectNamespace<JWTKeyProvider>;
        JWT_REGISTRY: Service<JWTRegistry>;
        JWT_REGISTRY_DO: DurableObjectNamespace<I_JWT_Registry_DO>;
    }
}
