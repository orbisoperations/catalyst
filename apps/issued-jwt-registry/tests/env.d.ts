declare module "cloudflare:test" {
	// Controls the type of `import("cloudflare:test").env`
	import IJ_Registry from '@catalyst/issued-jwt-registry/src/index';
	// import AuthzedWorker from "@catalyst/authx_authzed_api/src";
	// import JWTWorker from "@catalyst/authx_token_api";

	interface ProvidedEnv extends Env {
		ISSUED_JWT_REGISTRY: DurableObjectNamespace<IJ_Registry>;
		// AUTHX_AUTHZED_API: Service<AuthzedWorker>
		// AUTHX_TOKEN_API: Service<JWTWorker>
	}
}
