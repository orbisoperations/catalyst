import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import {
	OrgInviteStoredResponseSchema,
	parseStoredInvite,
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
	OrgIdSchema,
} from '@catalyst/schemas';
import { Env } from './env';

function parseMailbox(raw: unknown): OrgInvite[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((item) => parseStoredInvite(item));
}

function clientErrorMessage(error: unknown): string {
	if (error instanceof CatalystError) return error.message;
	// Errors thrown inside blockConcurrencyWhile or across the DO-Worker RPC boundary
	// lose their CatalystError prototype but retain the original message.
	if (error instanceof Error && error.message.startsWith('CatalystError:')) {
		return error.message.replace(/^CatalystError:\s*/, '');
	}
	return 'An internal error occurred';
}

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
			senderEnabled: false,
			receiverEnabled: false,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		await this.ctx.blockConcurrencyWhile(async () => {
			const senderMailbox = parseMailbox(await this.ctx.storage.get(sender));
			const receiverMailbox = parseMailbox(await this.ctx.storage.get(receiver));

			// BIDIRECTIONAL CHECK: Only one pending invite allowed between any org pair
			// Check if sender already has a pending invite TO receiver
			const existingToReceiver = senderMailbox.find(
				(inv) => inv.receiver === receiver && inv.status === 'pending'
			);
			if (existingToReceiver) {
				throw new InvalidOperationError('A pending invite to this organization already exists');
			}

			// Check if receiver already has a pending invite TO sender (reverse direction)
			const existingFromReceiver = receiverMailbox.find(
				(inv) => inv.sender === receiver && inv.receiver === sender && inv.status === 'pending'
			);
			if (existingFromReceiver) {
				throw new InvalidOperationError('A pending invite from this organization already exists');
			}

			senderMailbox.push(newInvite);
			receiverMailbox.push(newInvite);

			await this.ctx.storage.put(sender, senderMailbox);
			await this.ctx.storage.put(receiver, receiverMailbox);
		});

		return newInvite;
	}

	async list(orgId: OrgId): Promise<OrgInvite[]> {
		return parseMailbox(await this.ctx.storage.get(orgId));
	}

	/**
	 * Reads an invite from the org mailbox
	 * @param orgId - The org id to read the invite from
	 * @param inviteId - The invite id to read
	 * @returns The invite
	 * @throws {InviteNotFoundError} If invite is not found
	 */
	async read(orgId: OrgId, inviteId: string): Promise<OrgInvite> {
		const mailbox = parseMailbox(await this.ctx.storage.get(orgId));
		const invite = mailbox.find((inv) => inv.id === inviteId);

		if (!invite) {
			throw new InviteNotFoundError(inviteId);
		}

		return invite;
	}

	/**
	 * Toggles the caller's data-sharing flag on a partnership invite.
	 * If the caller is the sender, flips `senderEnabled`.
	 * If the caller is the receiver, flips `receiverEnabled`.
	 *
	 * @param orgId - The ID of the organization toggling their sharing
	 * @param inviteId - The unique identifier of the invite to toggle
	 * @returns The updated invite
	 * @throws {InviteNotFoundError} If invite is not found in either mailbox
	 */
	async togglePartnership(orgId: OrgId, inviteId: string): Promise<OrgInvite> {
		// Pre-validate outside blockConcurrencyWhile to avoid durableObjectReset on expected errors.
		const orgMailbox = parseMailbox(await this.ctx.storage.get(orgId));
		const invite = orgMailbox.find((inv) => inv.id === inviteId);

		if (!invite) {
			throw new InviteNotFoundError(inviteId);
		}

		const otherOrg = invite.sender === orgId ? invite.receiver : invite.sender;
		const otherMailbox = parseMailbox(await this.ctx.storage.get(otherOrg));

		if (!otherMailbox.find((inv) => inv.id === inviteId)) {
			throw new InviteNotFoundError(inviteId);
		}

		// Mutation inside blockConcurrencyWhile with fresh reads for atomicity.
		let updatedInvite!: OrgInvite;

		await this.ctx.blockConcurrencyWhile(async () => {
			const freshOrgMailbox = parseMailbox(await this.ctx.storage.get(orgId));
			const freshOtherMailbox = parseMailbox(await this.ctx.storage.get(otherOrg));
			const freshInvite = freshOrgMailbox.find((inv) => inv.id === inviteId);

			if (!freshInvite) {
				throw new InviteNotFoundError(inviteId);
			}

			if (freshInvite.status !== 'accepted') {
				throw new InvalidOperationError('Can only toggle accepted partnerships');
			}

			const isSender = freshInvite.sender === orgId;

			if (isSender) {
				updatedInvite = { ...freshInvite, senderEnabled: !freshInvite.senderEnabled, updatedAt: Date.now() };
			} else {
				updatedInvite = {
					...freshInvite,
					receiverEnabled: !freshInvite.receiverEnabled,
					updatedAt: Date.now(),
				};
			}

			await this.ctx.storage.put(
				orgId,
				freshOrgMailbox.map((inv) => (inv.id === inviteId ? updatedInvite : inv))
			);
			await this.ctx.storage.put(
				otherOrg,
				freshOtherMailbox.map((inv) => (inv.id === inviteId ? updatedInvite : inv))
			);
		});

		return updatedInvite;
	}

	async setPartnershipFlags(
		orgId: OrgId,
		inviteId: string,
		senderEnabled: boolean,
		receiverEnabled: boolean
	): Promise<OrgInvite> {
		const orgMailbox = parseMailbox(await this.ctx.storage.get(orgId));
		const invite = orgMailbox.find((inv) => inv.id === inviteId);

		if (!invite) {
			throw new InviteNotFoundError(inviteId);
		}

		if (invite.status !== 'accepted') {
			throw new InvalidOperationError('Can only set flags on accepted partnerships');
		}

		const otherOrg = invite.sender === orgId ? invite.receiver : invite.sender;

		let updatedInvite!: OrgInvite;

		await this.ctx.blockConcurrencyWhile(async () => {
			const freshOrgMailbox = parseMailbox(await this.ctx.storage.get(orgId));
			const freshOtherMailbox = parseMailbox(await this.ctx.storage.get(otherOrg));
			const freshInvite = freshOrgMailbox.find((inv) => inv.id === inviteId);

			if (!freshInvite) {
				throw new InviteNotFoundError(inviteId);
			}

			updatedInvite = { ...freshInvite, senderEnabled, receiverEnabled, updatedAt: Date.now() };

			await this.ctx.storage.put(
				orgId,
				freshOrgMailbox.map((inv) => (inv.id === inviteId ? updatedInvite : inv))
			);
			await this.ctx.storage.put(
				otherOrg,
				freshOtherMailbox.map((inv) => (inv.id === inviteId ? updatedInvite : inv))
			);
		});

		return updatedInvite;
	}

	async respond(orgId: OrgId, inviteId: string, status: OrgInviteStatus): Promise<OrgInvite> {
		// Validate external input at boundary
		const validatedStatus = OrgInviteStatusSchema.parse(status);

		const responder = parseMailbox(await this.ctx.storage.get(orgId));

		const invite = responder.find((inv) => inv.id === inviteId);

		if (!invite) {
			throw new InviteNotFoundError(inviteId);
		}

		const otherOrg = invite.sender === orgId ? invite.receiver : invite.sender;

		const otherMailbox = parseMailbox(await this.ctx.storage.get(otherOrg));

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
				error: clientErrorMessage(error),
			});
		}
	}
	async togglePartnership(
		inviteId: string,
		token: Token,
		doNamespace: string = 'default'
	): Promise<OrgInviteResponse> {
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

			const preToggle = await stub.read(user.orgId, inviteId);
			const invite = await stub.togglePartnership(user.orgId, inviteId);

			const isSender = user.orgId === invite.sender;

			// Unidirectional: addPartnerToOrg(sharer, reader) means reader can see sharer's data
			try {
				if (isSender) {
					if (invite.senderEnabled) {
						await this.env.AUTHZED.addPartnerToOrg(invite.sender, invite.receiver);
					} else {
						await this.env.AUTHZED.deletePartnerInOrg(invite.sender, invite.receiver);
					}
				} else {
					if (invite.receiverEnabled) {
						await this.env.AUTHZED.addPartnerToOrg(invite.receiver, invite.sender);
					} else {
						await this.env.AUTHZED.deletePartnerInOrg(invite.receiver, invite.sender);
					}
				}
			} catch (spiceDbError) {
				// Rollback only the caller's flag — preserve the other org's flag from the
				// post-toggle invite to avoid overwriting a concurrent partner's toggle.
				try {
					await stub.setPartnershipFlags(
						user.orgId,
						inviteId,
						isSender ? preToggle.senderEnabled : invite.senderEnabled,
						isSender ? invite.receiverEnabled : preToggle.receiverEnabled
					);
				} catch (rollbackError) {
					console.error('[togglePartnership] rollback failed', {
						inviteId,
						orgId: user.orgId,
						original: spiceDbError instanceof Error ? spiceDbError.message : 'Unknown',
						rollback: rollbackError instanceof Error ? rollbackError.message : 'Unknown',
					});
				}
				throw spiceDbError;
			}

			return OrgInviteStoredResponseSchema.parse({ success: true, data: invite });
		} catch (error) {
			console.error('[togglePartnership] failed', {
				inviteId,
				error: error instanceof Error ? error.message : 'Unknown',
			});
			return OrgInviteResponseSchema.parse({
				success: false,
				error: clientErrorMessage(error),
			});
		}
	}
	async sendInvite(
		receivingOrg: OrgId,
		token: Token,
		message: string,
		doNamespace: string = 'default'
	): Promise<OrgInviteResponse> {
		try {
			if (!token.cfToken) {
				throw new UnauthorizedError();
			}

			// Validate receivingOrg format at API boundary
			const parseResult = OrgIdSchema.safeParse(receivingOrg);
			if (!parseResult.success) {
				throw new InvalidOperationError(
					parseResult.error.issues[0]?.message ?? 'Invalid organization ID format'
				);
			}

			const user = (await this.env.USERCACHE.getUser(token.cfToken)) as User | undefined;
			if (!user) {
				throw new InvalidUserError();
			}

			// Prevent self-invite
			if (user.orgId === receivingOrg) {
				throw new InvalidOperationError('Cannot invite your own organization');
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
				error: clientErrorMessage(error),
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

			// No SpiceDB calls on accept — data sharing is controlled per-org via toggle

			// Validate response at Worker boundary
			return OrgInviteResponseSchema.parse({ success: true, data: invite });
		} catch (error) {
			// Validate error response
			return OrgInviteResponseSchema.parse({
				success: false,
				error: clientErrorMessage(error),
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

			// Unconditionally delete both directions — deletePartnerInOrg is idempotent.
			// DO deletion is the source of truth; SpiceDB failure is logged but not fatal.
			try {
				await Promise.all([
					this.env.AUTHZED.deletePartnerInOrg(invite.sender, invite.receiver),
					this.env.AUTHZED.deletePartnerInOrg(invite.receiver, invite.sender),
				]);
			} catch (spiceDbError) {
				console.error('[declineInvite] SpiceDB cleanup failed', {
					inviteId,
					sender: invite.sender,
					receiver: invite.receiver,
					error: spiceDbError instanceof Error ? spiceDbError.message : 'Unknown',
				});
			}

			// Validate response at Worker boundary
			return OrgInviteResponseSchema.parse({ success: true, data: invite });
		} catch (error) {
			console.error('[declineInvite] failed', {
				inviteId,
				error: error instanceof Error ? error.message : 'Unknown',
			});
			// Validate error response
			return OrgInviteResponseSchema.parse({
				success: false,
				error: clientErrorMessage(error),
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

			const permCheck = await this.env.AUTHZED.isMemberOfOrg(user.orgId, user.userId);
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
				error: clientErrorMessage(error),
			});
		}
	}
}
