import {JWTKeyProvider} from "./durable_object_security_module"
import AuthzedWorker from "../../authx_authzed_api/src"
import UserCredsCacheWorker from "../../user_credentials_cache/src"
import IssuedJWTRegistryWorker from "../../issued_jwt_registry/src"

interface Env {
	KEY_PROVIDER: DurableObjectNamespace<JWTKeyProvider>;
	AUTHZED: Service<AuthzedWorker>
	USERCACHE: Service<UserCredsCacheWorker>
	ISSUED_JWT_REGISTRY_WORKER: Service<IssuedJWTRegistryWorker>
}
