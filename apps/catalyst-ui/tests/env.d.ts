import IssuedJWTRegistryWorker from '@catalyst/issued-jwt-registry/src/index';
//import {OrganizationMatchmakingDO} from "../../organization_matchmaking/src"
declare module 'cloudflare:test' {
	// Controls the type of `import("cloudflare:test").env
	  interface ProvidedEnv extends Env {
		ISSUED_JWT_WORKER: Service<IssuedJWTRegistryWorker>
		//ORG_MATCHMAKING: DurableObjectNamespace<OrganizationMatchmakingDO>
	}

}
