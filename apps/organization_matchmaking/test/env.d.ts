// unit tests Env
declare module 'cloudflare:test' {
	interface ProvidedEnv extends Env {
		AUTHZED: Service<import('../../authx_authzed_api/src').default>;
		ORG_MATCHMAKING: DurableObjectNamespace<import('../src/index').OrganizationMatchmakingDO>;
		USERCACHE: Service<import('../../user_credentials_cache/src').default>;
	}

	export const SELF: Service<import('../src/index').default>;
}
