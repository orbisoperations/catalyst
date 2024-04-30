import {JWTKeyProvider} from "./durable_object_security_module"
import AuthzedWorker from "../../authx_authzed_api/src"
import UserCredsCacheWorker from "../../user_credentials_cache/src"

interface Env {
	KEY_PROVIDER: DurableObjectNamespace<JWTKeyProvider>;
	AUTHZED: Service<AuthzedWorker>
	USERCACHE: Service<UserCredsCacheWorker>
}
