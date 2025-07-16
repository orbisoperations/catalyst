export interface Env {
	ORG_MATCHMAKING: DurableObjectNamespace<import('./index').OrganizationMatchmakingDO>;
	AUTHZED: Service<import('../../authx_authzed_api/src/index').default>;
	USERCACHE: Service<import('../../user-credentials-cache/src/index').default>;
}
