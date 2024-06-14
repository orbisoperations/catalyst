import RegistrarWorker from "@catalyst/data_channel_registrar/src/worker"
import JWTWorker from '@catalyst/authx_token_api/src';
import JWTRegistry from "../../issued-jwt-registry/src"
export interface Env  {
  DATA_CHANNEL_REGISTRAR: Service<RegistrarWorker>
  AUTHX_TOKEN_API: Service<JWTWorker>
  JWT_REGISTRY: Service<JWTRegistry>
}
