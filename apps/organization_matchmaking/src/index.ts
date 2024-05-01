import { DurableObject, WorkerEntrypoint, RpcTarget } from 'cloudflare:workers';
import { Env } from '../worker-configuration';
import { OrgId, OrgInvite, OrgInviteStatus, OrgInviteResponse, Token, User } from '../../../packages/schema_zod';
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

export class OrganizationMatchmakingDO extends DurableObject {
	async send(sender: OrgId, receiver: OrgId, message: string = '') {
		const newInvite = OrgInvite.parse({
			id: crypto.randomUUID(),
			sender: sender,
			receiver: receiver,
			status: OrgInviteStatus.enum.pending,
			message,
			isActive: true,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
		await this.ctx.blockConcurrencyWhile(async () => {
			const senderMailbox = (await this.ctx.storage.get<OrgInvite[]>(sender)) ?? new Array<OrgInvite>();
			const receiverMailbox = (await this.ctx.storage.get<OrgInvite[]>(receiver)) ?? new Array<OrgInvite>();
			senderMailbox.push(newInvite);
			receiverMailbox.push(newInvite);
			await this.ctx.storage.put(sender, senderMailbox);
			await this.ctx.storage.put(receiver, receiverMailbox);
		});

		return OrgInviteResponse.parse({
			success: true,
			invite: newInvite,
		});
	}

	async list(orgId: OrgId) {
		const listMailbox = (await this.ctx.storage.get<OrgInvite[]>(orgId)) ?? new Array<OrgInvite>();
		return OrgInviteResponse.parse({
			success: true,
			invite: listMailbox,
		});
	}

	async read(orgId: OrgId, inviteId: string) {
		const listMailbox = (await this.ctx.storage.get<OrgInvite[]>(orgId)) ?? new Array<OrgInvite>();
		const filteredInvites = listMailbox.filter((invite) => invite.id == inviteId);
		if (filteredInvites.length != 1) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst cannot find the invite',
			});
		}

		return OrgInviteResponse.parse({
			success: true,
			invite: filteredInvites[0],
		});
	}

	async togglePartnership(orgId: OrgId, inviteId: string) {
		// get invite from org mailbox
		const orgMailbox = (await this.ctx.storage.get<OrgInvite[]>(orgId)) ?? new Array<OrgInvite>();
		const filteredInvites = orgMailbox.filter((invite) => invite.id == inviteId);
		if (filteredInvites.length != 1) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst cannot find the invite',
			});
		}
		// toggle invite value
		const invite = filteredInvites[0];
		invite.isActive = !invite.isActive;
		await this.ctx.blockConcurrencyWhile(async () => {
			// update org mailbox
			await this.ctx.storage.put(
				orgId,
				orgMailbox.map((inviteF) => {
					if (inviteF.id == inviteId) {
						return invite;
					} else {
						return inviteF;
					}
				}),
			);
		});

		return OrgInviteResponse.parse({
			success: true,
			invite,
		});
	}

	async respond(orgId: OrgId, inviteId: string, status: OrgInviteStatus) {
		const responder = (await this.ctx.storage.get<OrgInvite[]>(orgId)) ?? new Array<OrgInvite>();
		const filteredInvites = responder.filter((invite) => invite.id == inviteId);
		if (filteredInvites.length != 1) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst cannot find the invite',
			});
		}

		const invite = filteredInvites[0];
		const otherOrg = invite.sender == orgId ? invite.receiver : invite.sender;
		const otherMailbox = (await this.ctx.storage.get<OrgInvite[]>(otherOrg)) ?? new Array<OrgInvite>();

		if (otherMailbox.filter((invite) => invite.id == inviteId).length != 1) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst cannot find the other invite',
			});
		}

		// from this point on we have both mailboxes and both have the invite

		// everyone can decline
		if (status == OrgInviteStatus.enum.declined) {
			await this.ctx.blockConcurrencyWhile(async () => {
				await this.ctx.storage.put(
					orgId,
					responder.filter((inviteF) => {
						return inviteF.id != inviteId;
					}),
				);
				await this.ctx.storage.put(
					otherOrg,
					otherMailbox.filter((inviteF) => {
						return inviteF.id != inviteId;
					}),
				);
			});
			return OrgInviteResponse.parse({
				success: true,
				invite: invite,
			});
		} else if (status == OrgInviteStatus.enum.accepted) {
			// only the receiver can accept
			if (invite.sender == orgId) {
				return OrgInviteResponse.parse({
					success: false,
					error: 'sender cannot accept their own invite',
				});
			}

			await this.ctx.blockConcurrencyWhile(async () => {
				await this.ctx.storage.put(
					orgId,
					responder.map((inviteF) => {
						if (inviteF.id == inviteId) {
							return Object.assign(inviteF, { status: status });
						} else {
							return inviteF;
						}
					}),
				);
				await this.ctx.storage.put(
					otherOrg,
					otherMailbox.map((inviteF) => {
						if (inviteF.id == inviteId) {
							return Object.assign(inviteF, { status: status });
						} else {
							return inviteF;
						}
					}),
				);
			});

			return OrgInviteResponse.parse({
				success: true,
				invite: Object.assign(invite, { status: status }),
			});
		} else {
			return OrgInviteResponse.parse({
				success: false,
				error: 'cannot change back to pending',
			});
		}
	}
}

export default class OrganizationMatchmakingWorker extends WorkerEntrypoint<Env> {
	async readInvite(inviteId: string, token: Token, doNamespace: string = 'default') {
		if (!token.cfToken) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a verifiable credential',
			});
		}

		const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
		if (!user) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a valid user',
			});
		}

		const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
		if (!permCheck) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst rejects users abiltiy to add an org partner',
			});
		}
		const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
		const stub = this.env.ORG_MATCHMAKING.get(id);
		return await stub.read(user.orgId, inviteId);
	}
	async togglePartnership(inviteId: string, token: Token, doNamespace: string = 'default') {
		if (!token.cfToken) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a verifiable credential',
			});
		}

		const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
		if (!user) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a valid user',
			});
		}

		const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
		if (!permCheck) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst rejects users abiltiy to add an org partner',
			});
		}
		const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
		const stub = this.env.ORG_MATCHMAKING.get(id);
		const inviteOperation = await stub.togglePartnership(user.orgId, inviteId);
		if (inviteOperation.success) {
			const invite = OrgInvite.parse(inviteOperation.invite);
			console.log({ invite });
			const partner = user.orgId === invite.sender ? invite.receiver : invite.sender;
			const resp = invite.isActive
				? await this.env.AUTHZED.addPartnerToOrg(user.orgId, partner)
				: await this.env.AUTHZED.deletePartnerInOrg(user.orgId, partner);
			console.log({ resp });
		}
		return inviteOperation;
	}
	async sendInvite(receivingOrg: OrgId, token: Token, message: string, doNamespace: string = 'default') {
		if (!token.cfToken) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a verifiable credential',
			});
		}

		const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
		if (!user) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a valid user',
			});
		}

		// check token for permission
		const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
		if (!permCheck) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst rejects users abiltiy to add an org partner',
			});
		}

		const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
		const stub = this.env.ORG_MATCHMAKING.get(id);
		// Im using this to mock incoming invitations
		// return await stub.send(receivingOrg, user.orgId, message);
		// this is the right one
		return await stub.send(user.orgId, receivingOrg, message);
	}
	async acceptInvite(inviteId: string, token: Token, doNamespace: string = 'default') {
		// check token for perms
		if (!token.cfToken) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a verifiable credential',
			});
		}
		const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
		if (!user) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a valid user',
			});
		}
		// check token for permission
		const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
		if (!permCheck) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst rejects users abiltiy to add an org partner',
			});
		}

		const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
		const stub = this.env.ORG_MATCHMAKING.get(id);
		const inviteResp = await stub.respond(user.orgId, inviteId, 'accepted');
		if (inviteResp.success) {
			const invite = OrgInvite.parse(inviteResp.invite);
			const partnerWrites = await Promise.all([
				await this.env.AUTHZED.addPartnerToOrg(invite.sender, invite.receiver),
				await this.env.AUTHZED.addPartnerToOrg(invite.receiver, invite.sender),
			]);
			console.log(partnerWrites);
			return inviteResp;
		} else {
			return inviteResp;
		}
	}
	async declineInvite(inviteId: string, token: Token, doNamespace: string = 'default') {
		if (!token.cfToken) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a verifiable credential',
			});
		}
		const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
		if (!user) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a valid user',
			});
		}
		// check token for permission
		const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
		if (!permCheck) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst rejects users abiltiy to add an org partner',
			});
		}
		// check token for perms
		const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
		const stub = this.env.ORG_MATCHMAKING.get(id);
		const inviteResp = await stub.respond(user.orgId, inviteId, 'declined');
		if (inviteResp.success) {
			const invite = OrgInvite.parse(inviteResp.invite);
			const partnerWrites = await Promise.all([
				await this.env.AUTHZED.deletePartnerInOrg(invite.sender, invite.receiver),
				await this.env.AUTHZED.deletePartnerInOrg(invite.receiver, invite.sender),
			]);
			console.log(partnerWrites);
			return inviteResp;
		} else {
			return inviteResp;
		}
	}
	async listInvites(token: Token, doNamespace: string = 'default') {
		if (!token.cfToken) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a verifiable credential',
			});
		}
		const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
		if (!user) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst did not find a valid user',
			});
		}
		// check token for permission
		const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
		if (!permCheck) {
			return OrgInviteResponse.parse({
				success: false,
				error: 'catalyst rejects users abiltiy to add an org partner',
			});
		}
		const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
		const stub = this.env.ORG_MATCHMAKING.get(id);
		return await stub.list(user.orgId);
	}
}
