import {DurableObject, WorkerEntrypoint} from "cloudflare:workers"
import { Env } from "../worker-configuration"
/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

type status = "pending" | "accepted" | "denied"

interface invite {
	inviteId: string,
	sender: string,
	reciever: string,
	status: status
}

export class OrganizationMatchmakingDO extends DurableObject {
	async send(sender: string, reciever: string, token: string) {
		const newInvite = {
			inviteId: crypto.randomUUID(),
			sender: sender,
			reciever: reciever,
			status: "pending"
		} as invite

		this.ctx.storage.put(newInvite.inviteId, newInvite)
	}
	async list(orgId: string, token:string, status?: status) {}
	async respond(inviteId: string, status: status, token: string) {}
} 


export default class OrganizationMatchmakingWorker extends WorkerEntrypoint<Env> {}
