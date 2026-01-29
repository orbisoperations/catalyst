declare module 'cloudflare:test' {
	interface ProvidedEnv extends Env {
		KEY_PROVIDER: DurableObjectNamespace<import('../src/durable_object_security_module').JWTKeyProvider>;
		USERCACHE: Service<import('../../user_credentials_cache/src/index').default>;
		ISSUED_JWT_REGISTRY_WORKER: Service<import('../../issued-jwt-registry/src/index').default>;
		AUTHZED: Service<import('../../authx_authzed_api/src/index').default>;
		DATA_CHANNEL_REGISTRAR: Service<import('../../data_channel_registrar/src/worker').default>;
	}

	export const SELF: Service<import('../src/index').default>;
}
