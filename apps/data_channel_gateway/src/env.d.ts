import RegistrarWorker from "@catalyst/data_channel_registrar/src/worker"
import JWTWorker from '@catalyst/authx_token_api/src';
interface Env  {
  DATA_CHANNEL_REGISTRAR: Service<RegistrarWorker>
  AUTHX_TOKEN_API: Service<JWTWorker>
}