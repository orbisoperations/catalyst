declare module 'cloudflare:test' {
	// Controls the type of `import("cloudflare:test").env
	interface ProvidedEnv extends Env {
		ISSUED_JWT_REGISTRY: Service<IssuedJWTRegistryWorker>;
		ISSUED_JWT_REGISTRY_DO: DurableObjectNamespace<I_JWT_Registry_DO>;
	}

	export const SELF: Service<IssuedJWTRegistryWorker>;
}
