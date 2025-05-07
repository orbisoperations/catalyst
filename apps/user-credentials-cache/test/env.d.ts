import { UserCredsCache } from '../src/index';

declare module 'cloudflare:test' {
	// ProvidedEnv controls the type of `import("cloudflare:test").env`
	interface ProvidedEnv extends Env {
		CACHE: DurableObjectNamespace<UserCredsCache>;
	}

	// Ensure RPC properties and methods can be accessed with `SELF`
	export const SELF: Service<import('../src/index').default>;
}
