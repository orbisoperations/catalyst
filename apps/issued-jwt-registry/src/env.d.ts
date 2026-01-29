interface UserCacheService {
	getUser(token: string, cacheNamespace?: string): Promise<import('@catalyst/schemas').User | undefined>;
}

interface Env {
	ISSUED_JWT_REGISTRY_DO: DurableObjectNamespace<I_JWT_Registry_DO>;
	USERCACHE: UserCacheService;
}
