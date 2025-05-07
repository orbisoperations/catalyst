/**
 * Associate bindings declared in wrangler.jsonc with the TypeScript type system
 */
export interface Env {
	CACHE: DurableObjectNamespace<UserCredsCache>;
}
