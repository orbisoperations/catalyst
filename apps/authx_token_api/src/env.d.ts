import {JWTKeyProvider} from "./durable_object_security_module"
interface Env {
	KEY_PROVIDER: DurableObjectNamespace<JWTKeyProvider>;
}
