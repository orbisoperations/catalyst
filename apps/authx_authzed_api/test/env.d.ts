declare module "cloudflare:test" {
	// Controls the type of `import("cloudflare:test").env`

	interface ProvidedEnv extends Env {
		AUTHZED_ENDPOINT: string
		AUTHZED_KEY: string
		AUTHZED_PREFIX: string
	}

	export const SELF: Service<import("../src/index").default>
}
