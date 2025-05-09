// test/index.spec.ts
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { assert, describe, expect, it, beforeEach } from 'vitest';
import { OrgInvite, OrgInviteResponse, OrgInviteStatus } from '../../../packages/schema_zod';
import { User } from '../../../packages/schema_zod';

const SENDER_ORGANIZATION = 'default';

/**
 * Can be used to generate a list of invites with a specific number of pending, accepted, declined, and active invites
 * @param appendCount - The number of invites to append to the existing invites
 * @returns A list of invites
 */
function generateInvites(maxCount?: number) {
	// one pending and one accepted
	// offset by 7 and 10 days respectively
	// use the current date as the base
	const now = Date.now();

	const invites: OrgInvite[] = [];

	const totalInvites = maxCount || 5;

	for (let i = 0; i < totalInvites; i++) {
		// make the days offset by random amounts of days and hours
		const daysOffset = Math.floor(Math.random() * 10);
		const hoursOffset = Math.floor(Math.random() * 24);

		const invite: OrgInvite = {
			id: `test-invite-${i + 1}`,
			status: 'pending',
			sender: 'default',
			receiver: `test-receiver-org-${i + 1}`,
			message: `test-message ${i + 1}`,
			isActive: true,
			createdAt: now + daysOffset * 24 * 60 * 60 * 1000 + hoursOffset * 60 * 60 * 1000,
			updatedAt: now + daysOffset * 24 * 60 * 60 * 1000 + hoursOffset * 60 * 60 * 1000,
		};

		invites.push(invite);
	}
	return invites;
}

// Add type guard for successful response
function isSuccessfulResponse(response: OrgInviteResponse): response is { success: true; invite: OrgInvite | OrgInvite[] } {
	return response.success === true;
}

// Add type guard for array of invites
function isInviteArray(invite: OrgInvite | OrgInvite[]): invite is OrgInvite[] {
	return Array.isArray(invite);
}

// Standardize mock user creation
const createMockUser = (orgId: string) =>
	({
		userId: `test-user-${orgId}`,
		orgId,
		zitadelRoles: ['org-admin'] as const,
	}) as User;

describe('organization matchmaking worker', () => {
	// create a test to check that the worker is correctly initialized
	it('should be initialized', () => {
		const worker = SELF;
		expect(worker).toBeDefined();
	});

	// send invite
	it('should be able to send an invite', async () => {
		const id = await env.ORG_MATCHMAKING.idFromName('default');
		const stub = await env.ORG_MATCHMAKING.get(id);

		const inviteToSend = generateInvites(1)[0];
		const response: OrgInviteResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);

		const parsedResult = OrgInviteResponse.safeParse(response);
		expect(parsedResult.success).toBe(true);

		expect(response.success).toBe(true);
		if (isSuccessfulResponse(response)) {
			const inviteResponse = isInviteArray(response.invite) ? response.invite[0] : response.invite;
			expect(inviteResponse).toBeDefined();
		}
	});

	// test list invites
	it('should be able to list invites', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		const invite = generateInvites(1)[0];

		const response: OrgInviteResponse = await stub.list(invite.sender);

		// check if the response is a valid OrgInviteResponse
		const parsedResult = OrgInviteResponse.safeParse(response);
		expect(parsedResult.success).toBe(true);

		// check if the response is a valid OrgInviteResponse
		expect(response.success).toBe(true);

		// @ts-expect-error: ts complains about the type of the invite because no check before
		expect(response.invite).toBeInstanceOf(Array);
		// @ts-expect-error: ts complains about the type of the invite because no check before
		expect(response.invite.length).toBe(1);
	});

	// create more invites
	it('should be able to create more invites', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (instance, state) => {
			await state.storage.deleteAll();
		});

		const invites = generateInvites();

		for (const invite of invites) {
			const response: OrgInviteResponse = await stub.send(invite.sender, invite.receiver, invite.message);
			expect(response.success).toBe(true); // check if the invite was sent successfully
		}

		const response: OrgInviteResponse = await stub.list('default');
		expect(response.success).toBe(true);

		// @ts-expect-error: ts complains about the type of the invite because no check before
		// SENDER ORGANIZATION should have the same number of invites as the number of invites sent
		expect(response.invite.length).toBe(invites.length);

		// check if all the invites exists in the mailbox of the receiver
		if (!response.success) {
			assert(false);
		}

		const mailboxInvites = response.invite as OrgInvite[];
		if (!Array.isArray(mailboxInvites)) {
			throw new Error('Expected response.invite to be an array');
		}

		for (const invite of mailboxInvites) {
			const receiverMailbox = await stub.list(invite.receiver);
			expect(receiverMailbox.success).toBe(true);
			if (!receiverMailbox.success) {
				throw new Error('Failed to list receiver mailbox');
			}
			const receiverInvites = receiverMailbox.invite as OrgInvite[];
			expect(receiverInvites.length).toBe(1);
		}
	});

	// be able to read an invite
	it('should be able to read an invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		const response = await stub.list('default');
		const parsedResponse = OrgInviteResponse.parse(response);
		expect(parsedResponse.success).toBe(true);
		if (!parsedResponse.success) {
			throw new Error('Failed to list invites');
		}

		// At this point TypeScript knows parsedResponse.success is true
		const listInvites = Array.isArray(parsedResponse.invite) ? parsedResponse.invite : [parsedResponse.invite];
		if (!Array.isArray(listInvites)) {
			throw new Error('Expected response.invite to be an array');
		}

		for (const invite of listInvites) {
			const readResponse = await stub.read('default', invite.id);
			const parsedReadResponse = OrgInviteResponse.parse(readResponse);
			expect(parsedReadResponse.success).toBe(true);
			if (!parsedReadResponse.success) {
				throw new Error('Failed to read invite');
			}

			// At this point TypeScript knows parsedReadResponse.success is true
			const readInvite = Array.isArray(parsedReadResponse.invite) ? parsedReadResponse.invite[0] : parsedReadResponse.invite;
			expect(readInvite.id).toStrictEqual(invite.id);
		}
	});

	it('organization should be able to respond ACCEPT to an invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (instance, state) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];

		const inviteSentResponse: OrgInviteResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
		expect(inviteSentResponse.success).toBe(true);

		// @ts-expect-error: ts complains about the type of the invite because no check before
		const inviteResponse = inviteSentRespone.invite;
		expect(inviteResponse).toBeDefined();

		const response: OrgInviteResponse = await stub.respond(inviteToSend.receiver, inviteResponse.id, OrgInviteStatus.enum.accepted);
		expect(response.success).toBe(true);
	});

	it('organization should be able to respond DECLINE to an invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_, state) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];

		const inviteSentRespone: OrgInviteResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
		expect(inviteSentRespone.success).toBe(true);

		// @ts-expect-error: ts complains about the type of the invite because no check before
		const inviteResponse = inviteSentRespone.invite;
		expect(inviteResponse).toBeDefined();

		const response: OrgInviteResponse = await stub.respond(inviteToSend.receiver, inviteResponse.id, OrgInviteStatus.enum.declined);
		expect(response.success).toBe(true);

		// check if the invite is still in the sender's mailbox
		const senderMailbox: OrgInviteResponse = await stub.list(inviteToSend.sender);
		expect(senderMailbox.success).toBe(true);
		// @ts-expect-error: TypeScript doesn't know success is true here
		expect(senderMailbox.invite.length).toStrictEqual(0);

		// check if the invite is still in receiver's mailbox
		const receiverMailbox: OrgInviteResponse = await stub.list(inviteToSend.receiver);
		expect(receiverMailbox.success).toBe(true);
		// @ts-expect-error: TypeScript doesn't know success is true here
		expect(receiverMailbox.invite.length).toStrictEqual(0);
	});

	it('organization cannot respond to ACCEPT/DECLINE to their own invite', async () => {
		// dependes on the previous test
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_, state) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];

		const inviteSentRespone: OrgInviteResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);

		// @ts-expect-error: ts complains about the type of the invite because no check before
		const invite: OrgInvite = inviteSentRespone.invite;
		expect(invite).toBeDefined();

		const response: OrgInviteResponse = await stub.respond('default', invite.id, OrgInviteStatus.enum.accepted);
		expect(response.success, 'Organization should not be able to respond to an invite it made; default').toBe(false);
	});

	// be able to toggle an invite
	it('should be able to toggle an invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_, state) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];

		const inviteSentRespone: OrgInviteResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
		expect(inviteSentRespone.success).toBe(true);

		// @ts-expect-error: ts complains about the type of the invite because no check before
		const createdInvite = inviteSentRespone.invite as OrgInvite;

		// get the invite from the sender's mailbox
		// validate that status is pending
		const readResponse: OrgInviteResponse = await stub.read(inviteToSend.sender, createdInvite.id);
		expect(readResponse.success).toBe(true);
		// @ts-expect-error: ts complains about the type of the invite because no check before
		expect(readResponse.invite.status).toBe(OrgInviteStatus.enum.pending);

		const toggledInviteResponse: OrgInviteResponse = await stub.togglePartnership('default', createdInvite.id);

		// @ts-expect-error: ts complains about the type of the invite because no check before
		const toggledInvite = toggledInviteResponse.invite as OrgInvite;
		// @ts-expect-error: ts complains about the type of the invite because no check before
		const readInvite = readResponse.invite as OrgInvite;

		// validate that the invite is toggled
		expect(toggledInvite.isActive).toBe(!readInvite.isActive);
	});

	it('should return appropriate error when invite is not found', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_, state) => {
			await state.storage.deleteAll();
		});

		// Try to read a non-existent invite
		const response = await stub.read('default', 'non-existent-invite-id');
		const parsedResponse = OrgInviteResponse.parse(response);

		// Verify the response
		expect(parsedResponse.success).toBe(false);
		if (!parsedResponse.success) {
			expect(parsedResponse.error).toBe('catalyst cannot find the invite');
		}
	});

	it('should return appropriate error when trying to toggle non-existent invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_, state) => {
			await state.storage.deleteAll();
		});

		// Try to toggle a non-existent invite
		const response = await stub.togglePartnership('default', 'non-existent-invite-id');
		const parsedResponse = OrgInviteResponse.parse(response);

		// Verify the response
		expect(parsedResponse.success).toBe(false);
		if (!parsedResponse.success) {
			expect(parsedResponse.error).toBe('catalyst cannot find the invite');
		}
	});

	it('should return error when trying to change invite status back to pending', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_, state) => {
			await state.storage.deleteAll();
		});

		// Create an invite
		const inviteToSend = generateInvites(1)[0];
		const inviteSentResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
		expect(inviteSentResponse.success).toBe(true);
		if (!inviteSentResponse.success) {
			throw new Error('Failed to send invite');
		}

		// Get the invite ID
		const invite = Array.isArray(inviteSentResponse.invite) ? inviteSentResponse.invite[0] : inviteSentResponse.invite;

		// Try to change status back to pending (which should fail)
		const response = await stub.respond(inviteToSend.receiver, invite.id, OrgInviteStatus.enum.pending);
		const parsedResponse = OrgInviteResponse.parse(response);

		// Verify the response
		expect(parsedResponse.success).toBe(false);
		if (!parsedResponse.success) {
			expect(parsedResponse.error).toBe('cannot change back to pending');
		}
	});

	it('should toggle correct invite when multiple invites exist in mailbox', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_, state) => {
			await state.storage.deleteAll();
		});

		// Create and send multiple invites
		const invites = generateInvites(3).map((invite) => ({
			...invite,
			receiver: 'test-receiver-org', // Override receiver to be the same for all invites
		}));

		const sentInvites: OrgInvite[] = [];
		for (const invite of invites) {
			const response = await stub.send(invite.sender, invite.receiver, invite.message);
			expect(response.success).toBe(true);
			if (!response.success) {
				throw new Error('Failed to send invite');
			}
			const sentInvite = Array.isArray(response.invite) ? response.invite[0] : response.invite;
			sentInvites.push(sentInvite);
		}

		// Get the invite from both mailboxes before toggle
		const senderReadResponse = await stub.read(invites[1].sender, sentInvites[1].id);
		const receiverReadResponse = await stub.read(invites[1].receiver, sentInvites[1].id);
		expect(senderReadResponse.success).toBe(true);
		expect(receiverReadResponse.success).toBe(true);
		if (!senderReadResponse.success || !receiverReadResponse.success) {
			throw new Error('Failed to read invite');
		}
		const senderReadInvite = Array.isArray(senderReadResponse.invite) ? senderReadResponse.invite[0] : senderReadResponse.invite;
		const receiverReadInvite = Array.isArray(receiverReadResponse.invite) ? receiverReadResponse.invite[0] : receiverReadResponse.invite;
		expect(senderReadInvite.isActive).toBe(true);
		expect(receiverReadInvite.isActive).toBe(true);

		// Toggle the invite
		const toggledInviteResponse = await stub.togglePartnership(invites[1].sender, sentInvites[1].id);
		expect(toggledInviteResponse.success).toBe(true);
		if (!toggledInviteResponse.success) {
			throw new Error('Failed to toggle invite');
		}

		const toggledInvite = Array.isArray(toggledInviteResponse.invite) ? toggledInviteResponse.invite[0] : toggledInviteResponse.invite;
		expect(toggledInvite.isActive).toBe(false);

		// Verify the toggle in both mailboxes
		const receiverListResponse = await stub.list(invites[1].receiver);
		const senderListResponse = await stub.list(invites[1].sender);

		const parsedReceiverResponse = OrgInviteResponse.parse(receiverListResponse);
		const parsedSenderResponse = OrgInviteResponse.parse(senderListResponse);

		expect(parsedReceiverResponse.success).toBe(true);
		expect(parsedSenderResponse.success).toBe(true);
		if (!parsedReceiverResponse.success || !parsedSenderResponse.success) {
			throw new Error('Failed to list invites');
		}

		const receiverMailboxInvites = Array.isArray(parsedReceiverResponse.invite)
			? parsedReceiverResponse.invite
			: [parsedReceiverResponse.invite];
		const senderMailboxInvites = Array.isArray(parsedSenderResponse.invite) ? parsedSenderResponse.invite : [parsedSenderResponse.invite];

		expect(receiverMailboxInvites.length).toBe(3);
		expect(senderMailboxInvites.length).toBe(3);

		// Check that only the target invite was updated in both mailboxes
		for (const invite of receiverMailboxInvites) {
			if (invite.id === sentInvites[1].id) {
				expect(invite.isActive).toBe(false);
			} else {
				expect(invite.isActive).toBe(true);
			}
		}

		for (const invite of senderMailboxInvites) {
			if (invite.id === sentInvites[1].id) {
				expect(invite.isActive).toBe(false);
			} else {
				expect(invite.isActive).toBe(true);
			}
		}
	});

	it('should return error when invite not found in respond', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_, state) => {
			await state.storage.deleteAll();
		});

		// Try to respond to a non-existent invite
		const response = await stub.respond('default', 'non-existent-id', OrgInviteStatus.enum.accepted);

		// Verify the response
		expect(response.success).toBe(false);
		if (!response.success) {
			expect(response.error).toBe('catalyst cannot find the invite');
		}
	});

	it('should return error when sender tries to accept their own invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_, state) => {
			await state.storage.deleteAll();
		});

		// Create an invite
		const inviteToSend = generateInvites(1)[0];
		const inviteSentResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
		expect(inviteSentResponse.success).toBe(true);
		if (!inviteSentResponse.success) {
			throw new Error('Failed to send invite');
		}

		// Get the invite ID
		const invite = Array.isArray(inviteSentResponse.invite) ? inviteSentResponse.invite[0] : inviteSentResponse.invite;

		// Try to accept the invite as the sender
		const response = await stub.respond(inviteToSend.sender, invite.id, OrgInviteStatus.enum.accepted);

		// Verify the response
		expect(response.success).toBe(false);
		if (!response.success) {
			expect(response.error).toBe('sender cannot accept their own invite');
		}
	});

	it('should return error when invite exists in receiver mailbox but not sender mailbox', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_, state) => {
			await state.storage.deleteAll();
		});

		// Create an invite
		const inviteToSend = generateInvites(1)[0];
		const inviteSentResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
		expect(inviteSentResponse.success).toBe(true);
		if (!inviteSentResponse.success) {
			throw new Error('Failed to send invite');
		}

		// Get the invite ID
		const invite = Array.isArray(inviteSentResponse.invite) ? inviteSentResponse.invite[0] : inviteSentResponse.invite;

		// Manually delete the invite from the sender's mailbox to simulate inconsistency
		await runInDurableObject(stub, async (_, state) => {
			const senderMailbox = (await state.storage.get<OrgInvite[]>(inviteToSend.sender)) ?? [];
			await state.storage.put(
				inviteToSend.sender,
				senderMailbox.filter((i) => i.id !== invite.id),
			);
		});

		// Try to respond to the invite as the receiver
		const response = await stub.respond(inviteToSend.receiver, invite.id, OrgInviteStatus.enum.accepted);

		// Verify the response
		expect(response.success).toBe(false);
		if (!response.success) {
			expect(response.error).toBe('catalyst cannot find the other invite');
		}
	});

	describe('readInvite', () => {
		it('should successfully read an invite when all conditions are met', async () => {
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);

			// Create an invite first
			const inviteToSend = generateInvites(1)[0];
			const inviteSentResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
			expect(inviteSentResponse.success).toBe(true);
			if (!inviteSentResponse.success) {
				throw new Error('Failed to send invite');
			}

			// Get the invite ID
			const invite = Array.isArray(inviteSentResponse.invite) ? inviteSentResponse.invite[0] : inviteSentResponse.invite;

			const mockUser: User = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;

			// Mock the USERCACHE binding used inside the worker
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			// Read the invite using the worker
			const worker = SELF;
			const response = await worker.readInvite(invite.id, { cfToken: 'valid-token' });

			expect(response.success).toBe(true);
			if (!response.success) {
				throw new Error('Failed to read invite');
			}
			// @ts-expect-error: TypeScript doesn't know invite is a single object here
			expect(response.invite.id).toBe(invite.id);
		});

		it('should return error when token is missing', async () => {
			const worker = SELF;
			const response = await worker.readInvite('some-id', { cfToken: '' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst did not find a verifiable credential');
			}
		});

		it('should return error when user is not found', async () => {
			// Mock USERCACHE to return no user
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => undefined;

			const worker = SELF;
			const response = await worker.readInvite('some-id', { cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst did not find a valid user');
			}
		});

		it('should return error when user lacks permissions', async () => {
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);

			// Create an invite first
			const inviteToSend = generateInvites(1)[0];
			const inviteSentResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
			expect(inviteSentResponse.success).toBe(true);
			if (!inviteSentResponse.success) {
				throw new Error('Failed to send invite');
			}

			// Get the invite ID
			const invite = Array.isArray(inviteSentResponse.invite) ? inviteSentResponse.invite[0] : inviteSentResponse.invite;

			// Mock the USERCACHE binding with a user
			const mockUser = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => false;

			const worker = SELF;
			const response = await worker.readInvite(invite.id, { cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst rejects users abiltiy to add an org partner');
			}
		});
	});

	describe('togglePartnership', () => {
		beforeEach(async () => {
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);

			// Clear storage before each test
			await runInDurableObject(stub, async (_, state) => {
				await state.storage.deleteAll();
			});
		});

		it('should successfully toggle an invite from active to inactive', async () => {
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);

			// Create an invite
			const inviteToSend = generateInvites(1)[0];
			const inviteSentResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
			expect(inviteSentResponse.success).toBe(true);
			if (!inviteSentResponse.success) {
				throw new Error('Failed to send invite');
			}

			const invite = Array.isArray(inviteSentResponse.invite) ? inviteSentResponse.invite[0] : inviteSentResponse.invite;

			// Mock the USERCACHE binding with a user
			const mockUser = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;

			await env.AUTHZED.addUserToOrg(inviteToSend.sender, mockUser.userId);

			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			// Toggle the invite using the worker
			const worker = SELF;
			const response = await worker.togglePartnership(invite.id, { cfToken: 'valid-token' });
			expect(response.success).toBe(true);
			if (!response.success) {
				throw new Error('Failed to toggle invite');
			}

			// Verify the toggle
			const toggledInvite = Array.isArray(response.invite) ? response.invite[0] : response.invite;
			expect(toggledInvite.isActive).toBe(false);
		});

		it('should return error when token is missing', async () => {
			const worker = SELF;
			const response = await worker.togglePartnership('some-id', { cfToken: '' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst did not find a verifiable credential');
			}
		});

		it('should return error when user is not found', async () => {
			// Mock USERCACHE to return no user
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => undefined;

			const worker = SELF;
			const response = await worker.togglePartnership('some-id', { cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst did not find a valid user');
			}
		});

		it('should return error when user lacks permissions', async () => {
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);

			// Create an invite
			const inviteToSend = generateInvites(1)[0];
			const inviteSentResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
			expect(inviteSentResponse.success).toBe(true);
			if (!inviteSentResponse.success) {
				throw new Error('Failed to send invite');
			}

			const invite = Array.isArray(inviteSentResponse.invite) ? inviteSentResponse.invite[0] : inviteSentResponse.invite;

			// Mock the USERCACHE binding with a user
			const mockUser = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => false;

			const worker = SELF;
			const response = await worker.togglePartnership(invite.id, { cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst rejects users ability to add an org partner');
			}
		});

		it('should return error when invite is not found', async () => {
			// Mock the USERCACHE binding with a user
			const mockUser = {
				userId: 'test-user',
				orgId: SENDER_ORGANIZATION,
			} as User;
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const worker = SELF;
			const response = await worker.togglePartnership('non-existent-id', { cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst cannot find the invite');
			}
		});
	});
});

describe('Invite Management', () => {
	beforeEach(async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// Clear storage before each test
		await runInDurableObject(stub, async (_, state) => {
			await state.storage.deleteAll();
		});
	});

	describe('sendInvite', () => {
		it('should successfully send an invite', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const response = await worker.sendInvite(inviteToSend.receiver, { cfToken: 'valid-token' }, inviteToSend.message);

			expect(response.success).toBe(true);
			if (!response.success) {
				throw new Error('Failed to send invite');
			}

			const invite = Array.isArray(response.invite) ? response.invite[0] : response.invite;
			expect(invite.sender).toBe(inviteToSend.sender);
			expect(invite.receiver).toBe(inviteToSend.receiver);
			expect(invite.message).toBe(inviteToSend.message);
			expect(invite.status).toBe('pending');
			expect(invite.isActive).toBe(true);
		});

		it('should return error when token is missing', async () => {
			const worker = SELF;
			const response = await worker.sendInvite('test-receiver-org-1', { cfToken: '' }, 'Test invite message');

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst did not find a verifiable credential');
			}
		});

		it('should return error when user lacks permissions', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			// Add user to org first
			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => false;

			const response = await worker.sendInvite('test-receiver-org-1', { cfToken: 'valid-token' }, 'Test invite message');

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst rejects users abiltiy to add an org partner');
			}
		});
	});

	describe('acceptInvite', () => {
		it('should successfully accept an invite', async () => {
			const worker = SELF;
			const receiverUser = createMockUser('test-receiver-org-1');
			const senderUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);
			await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);

			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => senderUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const sendResponse = await worker.sendInvite(inviteToSend.receiver, { cfToken: 'valid-token' }, inviteToSend.message);

			expect(sendResponse.success).toBe(true);
			if (!sendResponse.success) {
				throw new Error('Failed to send invite');
			}

			const invite = Array.isArray(sendResponse.invite) ? sendResponse.invite[0] : sendResponse.invite;

			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => receiverUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const acceptResponse = await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });

			expect(acceptResponse.success).toBe(true);
			if (!acceptResponse.success) {
				throw new Error('Failed to accept invite');
			}

			const acceptedInvite = Array.isArray(acceptResponse.invite) ? acceptResponse.invite[0] : acceptResponse.invite;
			expect(acceptedInvite.status).toBe('accepted');
		});

		it('should return error when sender tries to accept their own invite', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			// First send an invite
			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const sendResponse = await worker.sendInvite(inviteToSend.receiver, { cfToken: 'valid-token' }, inviteToSend.message);

			expect(sendResponse.success).toBe(true);
			if (!sendResponse.success) {
				throw new Error('Failed to send invite');
			}

			const invite = Array.isArray(sendResponse.invite) ? sendResponse.invite[0] : sendResponse.invite;

			// Try to accept as sender
			const acceptResponse = await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });

			expect(acceptResponse.success).toBe(false);
			if (!acceptResponse.success) {
				expect(acceptResponse.error).toBe('sender cannot accept their own invite');
			}
		});
	});

	describe('declineInvite', () => {
		it('should successfully decline an invite', async () => {
			const worker = SELF;
			const receiverUser = createMockUser('test-receiver-org-1');
			const senderUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);
			await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);

			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => senderUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const sendResponse = await worker.sendInvite(inviteToSend.receiver, { cfToken: 'valid-token' }, inviteToSend.message);

			expect(sendResponse.success).toBe(true);
			if (!sendResponse.success) {
				throw new Error('Failed to send invite');
			}

			const invite = Array.isArray(sendResponse.invite) ? sendResponse.invite[0] : sendResponse.invite;

			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => receiverUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const declineResponse = await worker.declineInvite(invite.id, { cfToken: 'valid-token' });

			expect(declineResponse.success).toBe(true);
			if (!declineResponse.success) {
				throw new Error('Failed to decline invite');
			}

			const declinedInvite = Array.isArray(declineResponse.invite) ? declineResponse.invite[0] : declineResponse.invite;
			expect(declinedInvite.status).toBe('declined');
		});
	});

	describe('listInvites', () => {
		it('should list all invites for an organization', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const invites = generateInvites(3);

			for (const invite of invites) {
				const response = await worker.sendInvite(invite.receiver, { cfToken: 'valid-token' }, invite.message);
				expect(response.success).toBe(true);
			}

			const listResponse = await worker.listInvites({ cfToken: 'valid-token' });

			expect(listResponse.success).toBe(true);
			if (!listResponse.success) {
				throw new Error('Failed to list invites');
			}

			const listedInvites = Array.isArray(listResponse.invite) ? listResponse.invite : [listResponse.invite];
			expect(listedInvites).toHaveLength(invites.length);

			// Verify each invite
			for (let i = 0; i < invites.length; i++) {
				expect(listedInvites[i].sender).toBe(invites[i].sender);
				expect(listedInvites[i].receiver).toBe(invites[i].receiver);
				expect(listedInvites[i].message).toBe(invites[i].message);
				expect(listedInvites[i].status).toBe('pending');
				expect(listedInvites[i].isActive).toBe(true);
			}
		});

		it('should return error when token is missing', async () => {
			const worker = SELF;
			const response = await worker.listInvites({ cfToken: '' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst did not find a verifiable credential');
			}
		});

		it('should return error when user is not found', async () => {
			const worker = SELF;
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => undefined;

			const response = await worker.listInvites({ cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst did not find a valid user');
			}
		});

		it('should return error when user lacks permissions', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			// Add user to org first
			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			// @ts-expect-error: Mock implementation doesn't match expected type
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => false;

			const response = await worker.listInvites({ cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('catalyst rejects users abiltiy to add an org partner');
			}
		});
	});
});
