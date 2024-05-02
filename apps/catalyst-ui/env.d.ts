import JWTWorker from "../authx_token_api/src";
import RegistrarWorker from "../data_channel_registrar/src/worker";
import AuthzedWorker from "../authx_authzed_api/src";
import UserCredsCacheWorker from "../user_credentials_cache/src";
import OrganizationMatchmakingWorker from "../organization_matchmaking/src";
interface CloudflareEnv {
  CATALYST_DATA_CHANNEL_REGISTRAR_API: Service<RegistrarWorker>;
  AUTHX_TOKEN_API: Service<JWTWorker>;
  AUTHX_AUTHZED_API: Service<AuthzedWorker>;
  USER_CREDS_CACHE: Service<UserCredsCacheWorker>;
  ORGANIZATION_MATCHMAKING: Service<OrganizationMatchmakingWorker>;
}
