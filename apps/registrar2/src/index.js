import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";
import {DataChannel} from "../../../packages/schema_zod"

export type Env = Record<string, string> & {
	DO: DurableObjectNamespace<Registrar>;
};

export default class RegistrarWorker extends WorkerEntrypoint<Env> {
	async fetch(request) {
		return Response.json({
			source: "RegistrarWorker",
			method: request.method,
			url: request.url,
			ctxWaitUntil: typeof this.ctx.waitUntil,
			envKeys: Object.keys(this.env).sort(),
		});
	}
	create(doNamespace, dataChannel){
		const doId = this.env.DO.idFromName(doNamespace)
		const stub = this.env.DO.get(doId)
		return stub.create(dataChannel)
	}
	update(doNamespace: string, dataChannel){
		const doId = this.env.DO.idFromName(doNamespace)
		const stub = this.env.DO.get(doId)
		return stub.update(dataChannel)
	}
	get(doNamespace: string, dataChannelId: string){
		const doId = this.env.DO.idFromName(doNamespace)
		const stub = this.env.DO.get(doId)
		return stub.get(dataChannelId)
	}
	list(doNamespace: string) {
		const doId = this.env.DO.idFromName(doNamespace)
		const stub = this.env.DO.get(doId)
		return stub.list()
	}
	delete(doNamespace: string, dataChannelID: string){
		const doId = this.env.DO.idFromName(doNamespace)
		const stub = this.env.DO.get(doId)
		return stub.delete(dataChannelID)
	}
}

export class Registrar extends  DurableObject {
	async list(){
		return this.ctx.storage.list<DataChannel>()
	}

	async get(id: string) {
		return await this.ctx.storage.get<DataChannel>(id)
		//TODO: implement claims
		// const {claims} = await c.req.json<{claims?: string[]}>()

		//TODO: implement claims
		// if (claims && dataChannel) {
		//     const filtered = claims.includes(dataChannel.id)
		//     return c.json(filtered,
		//         200)
		// } else {
		//     return c.json(`No data channel found: ${id}`, 500)
		// }
	}

	async create(dataChannel: Omit<DataChannel, "id">) {
		const newDC = Object.assign(dataChannel, {id: crypto.randomUUID()})
		return this.ctx.storage.put(newDC.id, newDC)
	}

	async update (dataChannel: DataChannel) {
		return this.ctx.storage.put(dataChannel.id, dataChannel)
	}

	async delete (id: string) {
		return this.ctx.storage.delete(id)
	}
}


