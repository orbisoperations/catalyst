export interface Env {
	KEY_PROVIDER: DurableObjectNamespace<import('./durable_object_security_module').JWTKeyProvider>;
	AUTHZED: Service<import('../../authx_authzed_api/src/index').default>;
	USERCACHE: Service<import('../../user-credentials-cache/src/index').default>;
	ISSUED_JWT_REGISTRY_WORKER: Service<import('../../issued-jwt-registry/src/index').default>;
	DATA_CHANNEL_REGISTRAR: Service<import('../../data_channel_registrar/src/worker').default>;
}
