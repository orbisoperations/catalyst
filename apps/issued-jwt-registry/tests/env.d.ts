declare module 'cloudflare:test' {

	import IssuedJWTRegistryWorker, { I_JWT_Registry } from '@catalyst/issued-jwt-registry/src/index';

	// Controls the type of `import("cloudflare:test").env

	interface ProvidedEnv extends Env {
		ISSUED_JWT_WORKER: Service<IssuedJWTRegistryWorker>
		ISSUED_JWT_REGISTRY_DO: DurableObjectNamespace<I_JWT_Registry_DO>
	}

	export const SELF: Service<IssuedJWTRegistryWorker>

}
