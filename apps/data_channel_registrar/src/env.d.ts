import {Registrar} from "./worker"
import AuthzedWorker  from "../../authx_authzed_api/src"
import JWTWorker from "../../authx_token_api/src"
import UserCredsCacheWorker from "../../user-credentials-cache/src"

interface Env  {
  DO: DurableObjectNamespace<Registrar>
  AUTHZED: Service<AuthzedWorker>
  JWTTOKEN: Service<JWTWorker>
  USERCACHE: Service<UserCredsCacheWorker>
}
