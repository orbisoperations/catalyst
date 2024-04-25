import { DataChannel } from "../../packages/schema_zod";
import JWTWorker from "../authx_token_api/src";
import RegistrarWorker from "../data_channel_registrar/src/worker";
import AuthzedWorker from "../authx_authzed_api/src"
import UserCredsCacheWorker from "../user_credentials_cache/src"

interface CloudflareEnv {
  CATALYST_DATA_CHANNEL_REGISTRAR_API: Service<AuthzedWorker>;
  AUTHX_TOKEN_API: Service<JWTWorker>;
  AUTHX_AUTHZED_API: Service<AuthzedWorker>
  USER_CREDS_CACHE: Service<UserCredsCacheWorker>
}
