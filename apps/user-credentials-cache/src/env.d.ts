/**
 * Associate bindings declared in wrangler.jsonc with the TypeScript type system
 */
export interface Env {
	CACHE: DurableObjectNamespace<UserCredsCache>;
	/** Optional override for the Cloudflare Access identity endpoint (used for E2E testing) */
	IDENTITY_ENDPOINT?: string;
}
