import {DurableObject, WorkerEntrypoint, RpcTarget} from "cloudflare:workers"
import { Env } from "../worker-configuration"
import {OrgId } from "../../../packages/schema_zod"
import Protocol from 'wrangler';
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


/*
	when an invite is created it is set to pending

	a pending invite can only be accepted by the receiver

	a pending invite can be declined by sender or receiver

	declining an accepted invite removes it
	declining a pending invite removes it

 */

type status = "pending" | "accepted" | "declined"

class Mailbox extends RpcTarget {
	invites: Invite[]

	constructor() {
		super();
		this.invites = new Array<Invite>()
	}

	removeById(id: string) {
		this.invites = this.invites.filter(invite => invite.id != id)
	}

	setStatus(id: string, status: status) {
		this.invites = this.invites.map(invite => {
			if (invite.id == id) {
				return Object.assign(invite, {status: status})
			}
			return invite
		})
	}
}
class Invite extends RpcTarget {
	id: string
	status: status
	sender: OrgId
	receiver: OrgId
	createdAt: number
	updatedAt: number

	constructor(sender: OrgId, receiver: OrgId) {
		super();
		this.id = crypto.randomUUID()
		this.sender = sender
		this.receiver = receiver
		this.status = "pending"
		this.createdAt = Date.now()
		this.updatedAt =  Date.now()
	}
}

export class OrganizationMatchmakingDO extends DurableObject {
	async send(sender: string, receiver: string) {
		// add token auth here (can user send invite to parnter)
		const newInvite = new Invite(sender, receiver)

		await this.ctx.blockConcurrencyWhile(async () => {
			const senderMailbox = await this.ctx.storage.get<Mailbox>(sender) ?? new Mailbox()
			const receiverMailbox = await this.ctx.storage.get<Mailbox>(sender) ?? new Mailbox()
			senderMailbox.invites.push(newInvite)
			receiverMailbox.invites.push(newInvite)
			await this.ctx.storage.put(sender, senderMailbox)
			await this.ctx.storage.put(receiver, receiverMailbox)
		})
	}
	async list(orgId: string) {
		// add token auth here (can user look at invites)
		const listMailbox = await this.ctx.storage.get<Mailbox>(orgId) ?? new Mailbox()
		return {
			pendingInvites: listMailbox.invites.filter(invite => invite.status == "pending"),
			acceptedInvites: listMailbox.invites.filter(invite => invite.status == "accepted"),
		}
	}
	async respond(orgId: OrgId, inviteId: string, status: status) {
		const responder = await this.ctx.storage.get<Mailbox>(orgId) ?? new Mailbox()
		const filteredInvites = responder.invites.filter(invite => invite.id == inviteId)
		if (filteredInvites.length != 1) {
			return {
				success: false,
				error: "catalyst cannot find the invite"
			}
		}

		const invite = filteredInvites[0]
		const otherOrg = invite.sender == orgId ? invite.receiver : invite.sender
		const otherMailbox = await this.ctx.storage.get<Mailbox>(otherOrg) ?? new Mailbox()

		if (otherMailbox.invites.filter(invite => invite.id == inviteId).length != 1) {
			return {
				success: false,
				error: "catalyst cannot find the other invite"
			}
		}

		// from this point on we have both mailboxes and both have the invite

		// everyone can decline
		if (status == "declined") {
			await this.ctx.blockConcurrencyWhile(async () => {
				otherMailbox.removeById(inviteId)
				responder.removeById(inviteId)
				await this.ctx.storage.put(orgId, responder)
				await this.ctx.storage.put(otherOrg, otherMailbox)
			})

			return {
				success: true
			}

		} else if (status == "accepted") {
			// only the receiver can accept
			if (invite.sender == orgId) {
				return {
					success: false,
					error: "sender cannot accept their own invite"
				}
			}

			await this.ctx.blockConcurrencyWhile(async () => {
				otherMailbox.setStatus(inviteId, status)
				responder.setStatus(inviteId, status)
				await this.ctx.storage.put(orgId, responder)
				await this.ctx.storage.put(otherOrg, otherMailbox)
			})

			return {
				success: true
			}

		} else {
			// status does not go back to pending so remove
			return {
				success: false,
				error: "cannot change back to pending"
			}
		}

	}
}


export default class OrganizationMatchmakingWorker extends WorkerEntrypoint<Env> {
	async sendInvite(receivingOrg: OrgId, token: string, doNamespace: string = "default") {
		// check token for permission
		const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace)
		const stub = this.env.ORG_MATCHMAKING.get(id)
		return await stub.send("stuborg", receivingOrg)
	}
	async acceptInvite(inviteId: string, token: string, doNamespace: string = "default"){
		// check token for perms
		const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace)
		const stub = this.env.ORG_MATCHMAKING.get(id)
		return await stub.respond("stuborg", inviteId, "accepted")
	}
	async declineInvite(inviteId: string,token: string, doNamespace: string = "default"){
		// check token for perms
		const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace)
		const stub = this.env.ORG_MATCHMAKING.get(id)
		return await stub.respond("stuborg", inviteId, "declined")
	}
	async listInvites(token: string, doNamespace: string = "default"){
		const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace)
		const stub = this.env.ORG_MATCHMAKING.get(id)
		return await stub.list("stuborg")
	}
}
