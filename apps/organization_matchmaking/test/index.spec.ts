// test/index.spec.ts
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { assert, describe, expect, it } from 'vitest';
import { OrgInvite, OrgInviteResponse, OrgInviteStatus } from '../../../packages/schema_zod';

//
const SENDER_ORGANIZATION = 'SENDER_ORGANIZATION-0';

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
			sender: SENDER_ORGANIZATION,
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

		const invite = generateInvites(1)[0];

		const response: OrgInviteResponse = await stub.send(invite.sender, invite.receiver, invite.message);

		const parsedResult = OrgInviteResponse.safeParse(response);
		expect(parsedResult.success).toBe(true);

		expect(response.success).toBe(true);
	});

	// test list invites
	it('should be able to list invites', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		const invite = generateInvites(1)[0];

		const response: OrgInviteResponse = await stub.list(invite.sender);
		console.log('response ja', response);

		// check if the response is a valid OrgInviteResponse
		const parsedResult = OrgInviteResponse.safeParse(response);
		expect(parsedResult.success).toBe(true);

		// check if the response is a valid OrgInviteResponse
		expect(response.success).toBe(true);

		// @ts-ignore: ts complains about the type of the invite because no check before
		expect(response.invite).toBeInstanceOf(Array);
		// @ts-ignore: ts complains about the type of the invite because no check before
		expect(response.invite.length).toBe(1);
	});

	// create more invites
	it('should be able to create more invites', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (instance, state) => {
			await state.storage.deleteAll();
			console.log('deleted all existing invites');
		});

		const invites = generateInvites();

		for (const invite of invites) {
			const response: OrgInviteResponse = await stub.send(invite.sender, invite.receiver, invite.message);
			expect(response.success).toBe(true); // check if the invite was sent successfully
		}

		const response: OrgInviteResponse = await stub.list(SENDER_ORGANIZATION);
		expect(response.success).toBe(true);

		// @ts-ignore: ts complains about the type of the invite because no check before
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

		const response: OrgInviteResponse = await stub.list(SENDER_ORGANIZATION);
		expect(response.success).toBe(true);
		if (!response.success) {
			throw new Error('Failed to list invites');
		}

		const listInvites = response.invite as OrgInvite[];
		if (!Array.isArray(listInvites)) {
			throw new Error('Expected response.invite to be an array');
		}

		for (const invite of listInvites) {
			const readResponse: OrgInviteResponse = await stub.read(SENDER_ORGANIZATION, invite.id);
			expect(readResponse.success).toBe(true);
			if (!readResponse.success) {
				throw new Error('Failed to read invite');
			}
			const readInvite = readResponse.invite as OrgInvite;
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

		const inviteSentRespone: OrgInviteResponse = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
		expect(inviteSentRespone.success).toBe(true);

		// @ts-ignore: ts complains about the type of the invite because no check before
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

		// @ts-ignore: ts complains about the type of the invite because no check before
		const inviteResponse = inviteSentRespone.invite;
		expect(inviteResponse).toBeDefined();

		const response: OrgInviteResponse = await stub.respond(inviteToSend.receiver, inviteResponse.id, OrgInviteStatus.enum.declined);
		expect(response.success).toBe(true);

		// check if the invite is still in the sender's mailbox
		const senderMailbox: OrgInviteResponse = await stub.list(inviteToSend.sender);
		expect(senderMailbox.success).toBe(true);
		expect(senderMailbox.invite.length).toStrictEqual(0);

		// check if the invite is still in receiver's mailbox
		const receiverMailbox: OrgInviteResponse = await stub.list(inviteToSend.receiver);
		expect(receiverMailbox.success).toBe(true);
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

		// @ts-ignore: ts complains about the type of the invite because no check before
		const invite: OrgInvite = inviteSentRespone.invite;
		expect(invite).toBeDefined();

		const response: OrgInviteResponse = await stub.respond(SENDER_ORGANIZATION, invite.id, OrgInviteStatus.enum.accepted);
		expect(response.success, 'Organization should not be able to respond to an invite it made; SENDER_ORGANIZATION').toBe(false);
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

		// @ts-ignore: ts complains about the type of the invite because no check before
		const createdInvite = inviteSentRespone.invite as OrgInvite;

		// get the invite from the sender's mailbox
		// validate that status is pending
		const readResponse: OrgInviteResponse = await stub.read(inviteToSend.sender, createdInvite.id);
		expect(readResponse.success).toBe(true);
		// @ts-ignore: ts complains about the type of the invite because no check before
		expect(readResponse.invite.status).toBe(OrgInviteStatus.enum.pending);

		const toggledInviteResponse: OrgInviteResponse = await stub.togglePartnership(SENDER_ORGANIZATION, createdInvite.id);

		// @ts-ignore: ts complains about the type of the invite because no check before
		const toggledInvite = toggledInviteResponse.invite as OrgInvite;
		// @ts-ignore: ts complains about the type of the invite because no check before
		const readInvite = readResponse.invite as OrgInvite;

		// validate that the invite is toggled
		expect(toggledInvite.isActive).toBe(!readInvite.isActive);
	});
});
