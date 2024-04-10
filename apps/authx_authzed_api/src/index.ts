import {AuthzedClient} from "./authzed"
import { WorkerEntrypoint, RpcTarget } from "cloudflare:workers";

type ENV = {
	AUTHZED_ENDPOINT: string
	AUTHZED_KEY: string
	AUTHZED_PREFIX: string
}

export default class AuthzedWorker extends WorkerEntrypoint<ENV> {
	async schema(){
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		const resp = await client.getSchema()
		return resp
	}
}
