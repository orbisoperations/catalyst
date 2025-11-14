import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import {
	OrgInviteStoredResponseSchema,
	OrgInvite,
	OrgInviteStatusSchema,
	OrgInviteStatus,
	OrgInviteResponseSchema,
	OrgInviteResponse,
	InviteNotFoundError,
	InvalidOperationError,
	UnauthorizedError,
	InvalidUserError,
	PermissionDeniedError,
	CatalystError,
	Token,
	User,
	OrgId,
} from '@catalyst/schemas';
import { Env } from './env';

/*
	when an invite is created it is set to pending

	a pending invite can only be accepted by the receiver

	a pending invite can be declined by sender or receiver

	declining an accepted invite removes it
	declining a pending invite removes it

 */

export class OrganizationMatchmakingDO extends DurableObject {
	async send(sender: OrgId, receiver: OrgId, message: string = ''): Promise<OrgInvite> {
		// Create invite with validated types (no schema validation needed for internal creation)
		const newInvite: OrgInvite = {
			id: crypto.randomUUID(),
			sender,
			receiver,
			status: 'pending',
			message,
			isActive: false,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		await this.ctx.blockConcurrencyWhile(async () => {
			const senderMailbox = (await this.ctx.storage.get<OrgInvite[]>(sender)) ?? [];
			const receiverMailbox = (await this.ctx.storage.get<OrgInvite[]>(receiver)) ?? [];

			senderMailbox.push(newInvite);
			receiverMailbox.push(newInvite);

			await this.ctx.storage.put(sender, senderMailbox);
			await this.ctx.storage.put(receiver, receiverMailbox);
		});

		return newInvite;
	}

	async list(orgId: OrgId): Promise<OrgInvite[]> {
		const mailbox = (await this.ctx.storage.get<OrgInvite[]>(orgId)) ?? [];
		return mailbox;
	}

	/**
	 * Reads an invite from the org mailbox
	 * @param orgId - The org id to read the invite from
	 * @param inviteId - The invite id to read
	 * @returns The invite
	 * @throws {InviteNotFoundError} If invite is not found
	 */
	async read(orgId: OrgId, inviteId: string): Promise<OrgInvite> {
		const mailbox = (await this.ctx.storage.get<OrgInvite[]>(orgId)) ?? [];
		const invite = mailbox.find((inv) => inv.id === inviteId);

		if (!invite) {
			throw new InviteNotFoundError(inviteId);
		}

		return invite;
	}

	/**
	 * Toggles the active status of a partnership invite between organizations.
	 *
	 * @param orgId - The ID of the organization whose mailbox contains the invite
	 * @param inviteId - The unique identifier of the invite to toggle
	 * @returns The updated invite
	 * @throws {InviteNotFoundError} If invite is not found in either mailbox
	 *
	 * @example
	 * ```typescript
	 * const invite = await durableObject.togglePartnership('org-123', 'invite-456');
	 * console.log('Invite status toggled:', invite.isActive);
	 * ```
	 */
	async togglePartnership(orgId: OrgId, inviteId: string): Promise<OrgInvite> {
		const orgMailbox = (await this.ctx.storage.get<OrgInvite[]>(orgId)) ?? [];

		const invite = orgMailbox.find((inv) => inv.id === inviteId);

		if (!invite) {
			throw new InviteNotFoundError(inviteId);
		}

		const otherOrg = invite.sender === orgId ? invite.receiver : invite.sender;

		const otherMailbox = (await this.ctx.storage.get<OrgInvite[]>(otherOrg)) ?? [];

		if (!otherMailbox.find((inv) => inv.id === inviteId)) {
			throw new InviteNotFoundError(inviteId);
		}

		const updatedInvite: OrgInvite = { ...invite, isActive: !invite.isActive, updatedAt: Date.now() };

		await this.ctx.blockConcurrencyWhile(async () => {
			const updatedOrgMailbox = orgMailbox.map((inv) => (inv.id === inviteId ? updatedInvite : inv));
			const updatedOtherMailbox = otherMailbox.map((inv) => (inv.id === inviteId ? updatedInvite : inv));

			await this.ctx.storage.put(orgId, updatedOrgMailbox);
			await this.ctx.storage.put(otherOrg, updatedOtherMailbox);
		});

		return updatedInvite;
	}

	async respond(orgId: OrgId, inviteId: string, status: OrgInviteStatus): Promise<OrgInvite> {
		// Validate external input at boundary
		const validatedStatus = OrgInviteStatusSchema.parse(status);

		const responder = (await this.ctx.storage.get<OrgInvite[]>(orgId)) ?? [];

		const invite = responder.find((inv) => inv.id === inviteId);

		if (!invite) {
			throw new InviteNotFoundError(inviteId);
		}

		const otherOrg = invite.sender === orgId ? invite.receiver : invite.sender;

		const otherMailbox = (await this.ctx.storage.get<OrgInvite[]>(otherOrg)) ?? [];

		if (!otherMailbox.find((inv) => inv.id === inviteId)) {
			throw new InviteNotFoundError(inviteId);
		}

		// Everyone can decline
		if (validatedStatus === 'declined') {
			await this.ctx.blockConcurrencyWhile(async () => {
				const filteredResponder = responder.filter((inv) => inv.id !== inviteId);
				const filteredOther = otherMailbox.filter((inv) => inv.id !== inviteId);

				await this.ctx.storage.put(orgId, filteredResponder);
				await this.ctx.storage.put(otherOrg, filteredOther);
			});
			const declinedInvite: OrgInvite = { ...invite, status: validatedStatus, updatedAt: Date.now() };
			return declinedInvite;
		}

		// Only receiver can accept
		if (validatedStatus === 'accepted') {
			if (invite.sender === orgId) {
				throw new InvalidOperationError('Sender cannot accept their own invite');
			}

			const updatedInvite: OrgInvite = { ...invite, status: validatedStatus, updatedAt: Date.now() };

			await this.ctx.blockConcurrencyWhile(async () => {
				const updatedResponder = responder.map((inv) => (inv.id === inviteId ? updatedInvite : inv));
				const updatedOther = otherMailbox.map((inv) => (inv.id === inviteId ? updatedInvite : inv));

				await this.ctx.storage.put(orgId, updatedResponder);
				await this.ctx.storage.put(otherOrg, updatedOther);
			});

			return updatedInvite;
		}

		throw new InvalidOperationError('Cannot change back to pending status');
	}
}

export default class OrganizationMatchmakingWorker extends WorkerEntrypoint<Env> {
	async readInvite(inviteId: string, token: Token, doNamespace: string = 'default'): Promise<OrgInviteResponse> {
		try {
			if (!token.cfToken) {
				throw new UnauthorizedError();
			}

			const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
			if (!user) {
				throw new InvalidUserError();
			}

			const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
			if (!permCheck) {
				throw new PermissionDeniedError('update org partners');
			}

			const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
			const stub = this.env.ORG_MATCHMAKING.get(id);
			const data = await stub.read(user.orgId, inviteId);

			// Validate response at Worker boundary using stored schema (lenient for old data)
			return OrgInviteStoredResponseSchema.parse({ success: true, data });
		} catch (error) {
			// Validate error response
			return OrgInviteResponseSchema.parse({
				success: false,
				error: error instanceof CatalystError ? error.message : error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}
	async togglePartnership(inviteId: string, token: Token, doNamespace: string = 'default'): Promise<OrgInviteResponse> {
		try {
			if (!token.cfToken) {
				throw new UnauthorizedError();
			}

			const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
			if (!user) {
				throw new InvalidUserError();
			}

			const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
			if (!permCheck) {
				throw new PermissionDeniedError('update org partners');
			}

			const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
			const stub = this.env.ORG_MATCHMAKING.get(id);

			const invite = await stub.togglePartnership(user.orgId, inviteId);

			const partner = user.orgId === invite.sender ? invite.receiver : invite.sender;

			if (invite.isActive) {
				await this.env.AUTHZED.addPartnerToOrg(user.orgId, partner);
			} else {
				await this.env.AUTHZED.deletePartnerInOrg(user.orgId, partner);
			}

			return OrgInviteStoredResponseSchema.parse({ success: true, data: invite });
		} catch (error) {
			return OrgInviteResponseSchema.parse({
				success: false,
				error: error instanceof CatalystError ? error.message : error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}
	async sendInvite(receivingOrg: OrgId, token: Token, message: string, doNamespace: string = 'default'): Promise<OrgInviteResponse> {
		try {
			if (!token.cfToken) {
				throw new UnauthorizedError();
			}

			const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
			if (!user) {
				throw new InvalidUserError();
			}

			const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
			if (!permCheck) {
				throw new PermissionDeniedError('send org invites');
			}

			const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
			const stub = this.env.ORG_MATCHMAKING.get(id);
			const data = await stub.send(user.orgId, receivingOrg, message);

			// Validate response at Worker boundary
			return OrgInviteResponseSchema.parse({ success: true, data });
		} catch (error) {
			// Validate error response
			return OrgInviteResponseSchema.parse({
				success: false,
				error: error instanceof CatalystError ? error.message : error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}
	async acceptInvite(inviteId: string, token: Token, doNamespace: string = 'default'): Promise<OrgInviteResponse> {
		try {
			if (!token.cfToken) {
				throw new UnauthorizedError();
			}

			const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
			if (!user) {
				throw new InvalidUserError();
			}

			const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
			if (!permCheck) {
				throw new PermissionDeniedError('accept org invites');
			}

			const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
			const stub = this.env.ORG_MATCHMAKING.get(id);
			const invite = await stub.respond(user.orgId, inviteId, 'accepted');

			await Promise.all([
				this.env.AUTHZED.addPartnerToOrg(invite.sender, invite.receiver),
				this.env.AUTHZED.addPartnerToOrg(invite.receiver, invite.sender),
			]);

			// Validate response at Worker boundary
			return OrgInviteResponseSchema.parse({ success: true, data: invite });
		} catch (error) {
			// Validate error response
			return OrgInviteResponseSchema.parse({
				success: false,
				error: error instanceof CatalystError ? error.message : error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}
	async declineInvite(inviteId: string, token: Token, doNamespace: string = 'default'): Promise<OrgInviteResponse> {
		try {
			if (!token.cfToken) {
				throw new UnauthorizedError();
			}

			const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
			if (!user) {
				throw new InvalidUserError();
			}

			const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
			if (!permCheck) {
				throw new PermissionDeniedError('decline org invites');
			}

			const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
			const stub = this.env.ORG_MATCHMAKING.get(id);
			const invite = await stub.respond(user.orgId, inviteId, 'declined');

			await Promise.all([
				this.env.AUTHZED.deletePartnerInOrg(invite.sender, invite.receiver),
				this.env.AUTHZED.deletePartnerInOrg(invite.receiver, invite.sender),
			]);

			// Validate response at Worker boundary
			return OrgInviteResponseSchema.parse({ success: true, data: invite });
		} catch (error) {
			// Validate error response
			return OrgInviteResponseSchema.parse({
				success: false,
				error: error instanceof CatalystError ? error.message : error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}
	async listInvites(token: Token, doNamespace: string = 'default'): Promise<OrgInviteResponse> {
		try {
			if (!token.cfToken) {
				throw new UnauthorizedError();
			}

			const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
			if (!user) {
				throw new InvalidUserError();
			}

			const permCheck = await this.env.AUTHZED.canUpdateOrgPartnersInOrg(user.orgId, user.userId);
			if (!permCheck) {
				throw new PermissionDeniedError('list org invites');
			}

			const id = this.env.ORG_MATCHMAKING.idFromName(doNamespace);
			const stub = this.env.ORG_MATCHMAKING.get(id);
			const data = await stub.list(user.orgId);

			// Validate response at Worker boundary using stored schema (lenient for old data)
			return OrgInviteStoredResponseSchema.parse({ success: true, data });
		} catch (error) {
			// Validate error response
			return OrgInviteResponseSchema.parse({
				success: false,
				error: error instanceof CatalystError ? error.message : error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}
}
