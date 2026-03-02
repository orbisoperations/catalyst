// test/index.spec.ts
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { OrgInvite, OrgInviteStatusSchema, OrgInviteStoredSchema, User } from '@catalyst/schemas';

const SENDER_ORGANIZATION = 'default';

/**
 * Can be used to generate a list of invites with a specific number of pending, accepted, declined, and active invites
 * @param appendCount - The number of invites to append to the existing invites
 * @returns A list of invites
 */
function createOldFormatInvite(overrides: {
	id?: string;
	sender: string;
	receiver: string;
	status?: string;
	isActive: boolean;
	disabledBy?: string | null;
}) {
	return {
		id: overrides.id ?? `old-invite-${crypto.randomUUID().slice(0, 8)}`,
		status: overrides.status ?? 'accepted',
		sender: overrides.sender,
		receiver: overrides.receiver,
		message: 'legacy invite',
		isActive: overrides.isActive,
		disabledBy: overrides.disabledBy ?? null,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
}

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
			senderEnabled: false,
			receiverEnabled: false,
			createdAt: now + daysOffset * 24 * 60 * 60 * 1000 + hoursOffset * 60 * 60 * 1000,
			updatedAt: now + daysOffset * 24 * 60 * 60 * 1000 + hoursOffset * 60 * 60 * 1000,
		};

		invites.push(invite);
	}
	return invites;
}

// Standardize mock user creation
const createMockUser = (orgId: string) =>
	({
		userId: `test-user-${orgId}`,
		orgId,
		zitadelRoles: ['org-admin'] as const,
	}) as User;

// Helper to mock USERCACHE.getUser with proper typing
const mockGetUser = (user: User | undefined) => {
	env.USERCACHE.getUser = (async () => user) as typeof env.USERCACHE.getUser;
};

describe('organization matchmaking worker', () => {
	// create a test to check that the worker is correctly initialized
	it('should be initialized', () => {
		const worker = SELF;
		expect(worker).toBeDefined();
	});

	// send invite (DO method returns entity directly)
	it('should be able to send an invite', async () => {
		const id = await env.ORG_MATCHMAKING.idFromName('default');
		const stub = await env.ORG_MATCHMAKING.get(id);

		const inviteToSend = generateInvites(1)[0];
		const invite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);

		expect(invite).toBeDefined();
		expect(invite.sender).toBe(inviteToSend.sender);
		expect(invite.receiver).toBe(inviteToSend.receiver);
		expect(invite.message).toBe(inviteToSend.message);
		expect(invite.status).toBe('pending');
	});

	// test list invites (DO method returns array directly)
	it('should be able to list invites', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		const invite = generateInvites(1)[0];

		const invites: OrgInvite[] = await stub.list(invite.sender);

		// check if the response is an array
		expect(invites).toBeInstanceOf(Array);
		expect(invites.length).toBe(1);
	});

	// create more invites
	it('should be able to create more invites', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_instance: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		const invites = generateInvites();

		for (const invite of invites) {
			const createdInvite: OrgInvite = await stub.send(invite.sender, invite.receiver, invite.message);
			expect(createdInvite).toBeDefined(); // check if the invite was sent successfully
		}

		const senderInvites: OrgInvite[] = await stub.list('default');
		// SENDER ORGANIZATION should have the same number of invites as the number of invites sent
		expect(senderInvites.length).toBe(invites.length);

		// check if all the invites exists in the mailbox of the receiver
		for (const invite of senderInvites) {
			const receiverMailbox: OrgInvite[] = await stub.list(invite.receiver);
			expect(receiverMailbox.length).toBe(1);
		}
	});

	// be able to read an invite
	it('should be able to read an invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		const listInvites: OrgInvite[] = await stub.list('default');
		expect(listInvites.length).toBeGreaterThan(0);

		for (const invite of listInvites) {
			const readInvite: OrgInvite = await stub.read('default', invite.id);
			expect(readInvite.id).toStrictEqual(invite.id);
		}
	});

	it('organization should be able to respond ACCEPT to an invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_instance: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];

		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);
		expect(createdInvite).toBeDefined();

		const acceptedInvite: OrgInvite = await stub.respond(
			inviteToSend.receiver,
			createdInvite.id,
			OrgInviteStatusSchema.enum.accepted
		);
		expect(acceptedInvite.status).toBe('accepted');
	});

	it('organization should be able to respond DECLINE to an invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];

		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);
		expect(createdInvite).toBeDefined();

		const declinedInvite: OrgInvite = await stub.respond(
			inviteToSend.receiver,
			createdInvite.id,
			OrgInviteStatusSchema.enum.declined
		);
		expect(declinedInvite.status).toBe('declined');

		// check if the invite is still in the sender's mailbox (should be removed)
		const senderMailbox: OrgInvite[] = await stub.list(inviteToSend.sender);
		expect(senderMailbox.length).toStrictEqual(0);

		// check if the invite is still in receiver's mailbox (should be removed)
		const receiverMailbox: OrgInvite[] = await stub.list(inviteToSend.receiver);
		expect(receiverMailbox.length).toStrictEqual(0);
	});

	it('organization cannot respond to ACCEPT/DECLINE to their own invite', async () => {
		// dependes on the previous test
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];

		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);
		expect(createdInvite).toBeDefined();

		// Try to accept as sender - should throw
		try {
			await stub.respond('default', createdInvite.id, OrgInviteStatusSchema.enum.accepted);
			expect.fail('Should have thrown error when sender tries to accept their own invite');
		} catch (error) {
			expect(error).toBeDefined();
			expect((error as Error).message).toContain('cannot accept their own invite');
		}
	});

	// be able to toggle an invite (must be accepted first)
	it('should be able to toggle an accepted invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];

		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);
		expect(createdInvite).toBeDefined();

		// Accept the invite first (receiver accepts)
		const acceptedInvite: OrgInvite = await stub.respond(
			inviteToSend.receiver,
			createdInvite.id,
			OrgInviteStatusSchema.enum.accepted
		);
		expect(acceptedInvite.status).toBe('accepted');

		// Sender toggles their sharing on
		const toggledInvite: OrgInvite = await stub.togglePartnership('default', createdInvite.id);

		// Sender's flag flipped, receiver's unchanged
		expect(toggledInvite.senderEnabled).toBe(true);
		expect(toggledInvite.receiverEnabled).toBe(false);
	});

	it('should return appropriate error when invite is not found', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		// Try to read a non-existent invite - DO method should throw
		try {
			await stub.read('default', 'non-existent-invite-id');
			expect.fail('Should have thrown InviteNotFoundError');
		} catch (error) {
			expect(error).toBeDefined();
			expect((error as Error).message).toContain('not found');
		}
	});

	it('should return appropriate error when trying to toggle non-existent invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		// Try to toggle a non-existent invite - DO method should throw
		try {
			await stub.togglePartnership('default', 'non-existent-invite-id');
			expect.fail('Should have thrown InviteNotFoundError');
		} catch (error) {
			expect(error).toBeDefined();
			expect((error as Error).message).toContain('not found');
		}
	});

	it('should return error when trying to change invite status back to pending', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		// Create an invite
		const inviteToSend = generateInvites(1)[0];
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);
		expect(createdInvite).toBeDefined();

		// Try to change status back to pending (which should fail)
		try {
			await stub.respond(inviteToSend.receiver, createdInvite.id, OrgInviteStatusSchema.enum.pending);
			expect.fail('Should have thrown error when trying to change back to pending');
		} catch (error) {
			expect(error).toBeDefined();
			expect((error as Error).message).toContain('Cannot change back to pending');
		}
	});

	it('should toggle correct invite when multiple invites exist in mailbox', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		// Create and send multiple invites to DIFFERENT receivers (respecting duplicate constraint)
		const invites = generateInvites(3); // Each has unique receiver already

		const sentInvites: OrgInvite[] = [];
		for (const invite of invites) {
			const createdInvite: OrgInvite = await stub.send(invite.sender, invite.receiver, invite.message);
			sentInvites.push(createdInvite);
		}

		// Accept all invites (receiver accepts) so they can be toggled
		for (let i = 0; i < sentInvites.length; i++) {
			await stub.respond(invites[i].receiver, sentInvites[i].id, OrgInviteStatusSchema.enum.accepted);
		}

		// Get the invite from both mailboxes before toggle
		const senderReadInvite: OrgInvite = await stub.read(invites[1].sender, sentInvites[1].id);
		const receiverReadInvite: OrgInvite = await stub.read(invites[1].receiver, sentInvites[1].id);
		expect(senderReadInvite.senderEnabled).toBe(false);
		expect(receiverReadInvite.senderEnabled).toBe(false);

		// Sender toggles their sharing on for the second invite
		const toggledInvite: OrgInvite = await stub.togglePartnership(invites[1].sender, sentInvites[1].id);
		expect(toggledInvite.senderEnabled).toBe(true);
		expect(toggledInvite.receiverEnabled).toBe(false);

		// Verify the toggle in sender's mailbox (has all 3 invites)
		const senderMailboxInvites: OrgInvite[] = await stub.list(invites[1].sender);
		expect(senderMailboxInvites.length).toBe(3);

		// Check that only the target invite was updated
		for (const invite of senderMailboxInvites) {
			if (invite.id === sentInvites[1].id) {
				expect(invite.senderEnabled).toBe(true);
			} else {
				expect(invite.senderEnabled).toBe(false);
			}
		}

		// Verify in receiver's mailbox (has only 1 invite)
		const receiverMailboxInvites: OrgInvite[] = await stub.list(invites[1].receiver);
		expect(receiverMailboxInvites.length).toBe(1);
		expect(receiverMailboxInvites[0].senderEnabled).toBe(true);
	});

	it('should return error when invite not found in respond', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		// Try to respond to a non-existent invite - DO method should throw
		try {
			await stub.respond('default', 'non-existent-id', OrgInviteStatusSchema.enum.accepted);
			expect.fail('Should have thrown InviteNotFoundError');
		} catch (error) {
			expect(error).toBeDefined();
			expect((error as Error).message).toContain('not found');
		}
	});

	it('should return error when sender tries to accept their own invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		// Create an invite
		const inviteToSend = generateInvites(1)[0];
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);
		expect(createdInvite).toBeDefined();

		// Try to accept the invite as the sender - DO method should throw
		try {
			await stub.respond(inviteToSend.sender, createdInvite.id, OrgInviteStatusSchema.enum.accepted);
			expect.fail('Should have thrown error when sender tries to accept their own invite');
		} catch (error) {
			expect(error).toBeDefined();
			expect((error as Error).message).toContain('cannot accept their own invite');
		}
	});

	it('should return error when invite exists in receiver mailbox but not sender mailbox', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		// Create an invite
		const inviteToSend = generateInvites(1)[0];
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);
		expect(createdInvite).toBeDefined();

		// Manually delete the invite from the sender's mailbox to simulate inconsistency
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			const senderMailbox = ((await state.storage.get(inviteToSend.sender)) as OrgInvite[]) ?? [];
			await state.storage.put(
				inviteToSend.sender,
				senderMailbox.filter((i: OrgInvite) => i.id !== createdInvite.id)
			);
		});

		// Try to respond to the invite as the receiver - DO method should throw
		try {
			await stub.respond(inviteToSend.receiver, createdInvite.id, OrgInviteStatusSchema.enum.accepted);
			expect.fail('Should have thrown InviteNotFoundError');
		} catch (error) {
			expect(error).toBeDefined();
			expect((error as Error).message).toContain('not found');
		}
	});

	describe('readInvite', () => {
		it('should successfully read an invite when all conditions are met', async () => {
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);

			// Create an invite first
			const inviteToSend = generateInvites(1)[0];
			const createdInvite: OrgInvite = await stub.send(
				inviteToSend.sender,
				inviteToSend.receiver,
				inviteToSend.message
			);
			expect(createdInvite).toBeDefined();

			const mockUser: User = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;

			// Mock the USERCACHE binding used inside the worker
			mockGetUser(mockUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			// Read the invite using the worker
			const worker = SELF;
			const response = await worker.readInvite(createdInvite.id, { cfToken: 'valid-token' });

			expect(response.success).toBe(true);
			if (!response.success) {
				throw new Error('Failed to read invite');
			}
			expect(response.data).toBeDefined();
			// data should be a single OrgInvite, not an array
			const invite = response.data as OrgInvite;
			expect(invite.id).toBe(createdInvite.id);
		});

		it('should return error when token is missing', async () => {
			const worker = SELF;
			const response = await worker.readInvite('some-id', { cfToken: '' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('No verifiable credential found');
			}
		});

		it('should return error when user is not found', async () => {
			// Mock USERCACHE to return no user
			mockGetUser(undefined);

			const worker = SELF;
			const response = await worker.readInvite('some-id', { cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('Invalid or non-existent user');
			}
		});

		it('should return error when user lacks permissions', async () => {
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);

			// Clear storage first to avoid duplicate invite conflicts
			await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
				await state.storage.deleteAll();
			});

			// Create an invite first
			const inviteToSend = generateInvites(1)[0];
			const createdInvite: OrgInvite = await stub.send(
				inviteToSend.sender,
				inviteToSend.receiver,
				inviteToSend.message
			);
			expect(createdInvite).toBeDefined();

			// Mock the USERCACHE binding with a user
			const mockUser = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;
			mockGetUser(mockUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => false;

			const worker = SELF;
			const response = await worker.readInvite(createdInvite.id, { cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('Permission denied: update org partners');
			}
		});
	});

	describe('togglePartnership', () => {
		beforeEach(async () => {
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);

			// Clear storage before each test
			await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
				await state.storage.deleteAll();
			});
		});

		it('should successfully toggle an accepted invite from inactive to active', async () => {
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);

			// Create an invite
			const inviteToSend = generateInvites(1)[0];
			const createdInvite: OrgInvite = await stub.send(
				inviteToSend.sender,
				inviteToSend.receiver,
				inviteToSend.message
			);
			expect(createdInvite).toBeDefined();

			// Accept the invite first (receiver accepts)
			await stub.respond(inviteToSend.receiver, createdInvite.id, OrgInviteStatusSchema.enum.accepted);

			// Mock the USERCACHE binding with a user
			const mockUser = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;

			await env.AUTHZED.addUserToOrg(inviteToSend.sender, mockUser.userId);

			mockGetUser(mockUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			// Toggle the invite using the worker
			const worker = SELF;
			const response = await worker.togglePartnership(createdInvite.id, { cfToken: 'valid-token' });
			expect(response.success).toBe(true);
			if (!response.success) {
				throw new Error('Failed to toggle invite');
			}

			// Verify the toggle — sender toggled, so senderEnabled flipped to true
			const toggledInvite = response.data as OrgInvite;
			expect(toggledInvite.senderEnabled).toBe(true);
			expect(toggledInvite.receiverEnabled).toBe(false);
		});

		it('should return error when token is missing', async () => {
			const worker = SELF;
			const response = await worker.togglePartnership('some-id', { cfToken: '' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('No verifiable credential found');
			}
		});

		it('should return error when user is not found', async () => {
			// Mock USERCACHE to return no user
			mockGetUser(undefined);

			const worker = SELF;
			const response = await worker.togglePartnership('some-id', { cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('Invalid or non-existent user');
			}
		});

		it('should return error when user lacks permissions', async () => {
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);

			// Create an invite
			const inviteToSend = generateInvites(1)[0];
			const createdInvite: OrgInvite = await stub.send(
				inviteToSend.sender,
				inviteToSend.receiver,
				inviteToSend.message
			);
			expect(createdInvite).toBeDefined();

			// Mock the USERCACHE binding with a user
			const mockUser = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;
			mockGetUser(mockUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => false;

			const worker = SELF;
			const response = await worker.togglePartnership(createdInvite.id, { cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('Permission denied: update org partners');
			}
		});

		it('should return error when invite is not found', async () => {
			// Mock the USERCACHE binding with a user
			const mockUser = {
				userId: 'test-user',
				orgId: SENDER_ORGANIZATION,
			} as User;
			mockGetUser(mockUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const worker = SELF;
			const response = await worker.togglePartnership('non-existent-id', { cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('not found');
			}
		});
	});

	// Bug 4: Status guard — toggle should only work on accepted partnerships
	it('should reject toggle on non-accepted invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);
		expect(createdInvite).toBeDefined();
		expect(createdInvite.status).toBe('pending');

		// Attempt to toggle a pending invite — should throw
		try {
			await stub.togglePartnership('default', createdInvite.id);
			expect.fail('Should have thrown InvalidOperationError for pending invite');
		} catch (error) {
			expect(error).toBeDefined();
			expect((error as Error).message).toContain('Can only toggle accepted partnerships');
		}
	});

	// Per-org toggle: sender toggle only flips senderEnabled
	it('should only flip senderEnabled when sender toggles', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);

		await stub.respond(inviteToSend.receiver, createdInvite.id, OrgInviteStatusSchema.enum.accepted);

		// Sender enables sharing
		const afterSenderOn: OrgInvite = await stub.togglePartnership(inviteToSend.sender, createdInvite.id);
		expect(afterSenderOn.senderEnabled).toBe(true);
		expect(afterSenderOn.receiverEnabled).toBe(false);

		// Sender disables sharing
		const afterSenderOff: OrgInvite = await stub.togglePartnership(inviteToSend.sender, createdInvite.id);
		expect(afterSenderOff.senderEnabled).toBe(false);
		expect(afterSenderOff.receiverEnabled).toBe(false);
	});

	// Per-org toggle: receiver toggle only flips receiverEnabled
	it('should only flip receiverEnabled when receiver toggles', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);

		await stub.respond(inviteToSend.receiver, createdInvite.id, OrgInviteStatusSchema.enum.accepted);

		// Receiver enables sharing
		const afterReceiverOn: OrgInvite = await stub.togglePartnership(inviteToSend.receiver, createdInvite.id);
		expect(afterReceiverOn.senderEnabled).toBe(false);
		expect(afterReceiverOn.receiverEnabled).toBe(true);

		// Receiver disables sharing
		const afterReceiverOff: OrgInvite = await stub.togglePartnership(inviteToSend.receiver, createdInvite.id);
		expect(afterReceiverOff.senderEnabled).toBe(false);
		expect(afterReceiverOff.receiverEnabled).toBe(false);
	});

	// Per-org toggle: both orgs toggle independently
	it('should allow sender and receiver to toggle independently', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);

		await stub.respond(inviteToSend.receiver, createdInvite.id, OrgInviteStatusSchema.enum.accepted);

		// Sender enables
		await stub.togglePartnership(inviteToSend.sender, createdInvite.id);
		// Receiver enables
		const bothOn: OrgInvite = await stub.togglePartnership(inviteToSend.receiver, createdInvite.id);
		expect(bothOn.senderEnabled).toBe(true);
		expect(bothOn.receiverEnabled).toBe(true);

		// Sender disables — receiver stays on
		const senderOff: OrgInvite = await stub.togglePartnership(inviteToSend.sender, createdInvite.id);
		expect(senderOff.senderEnabled).toBe(false);
		expect(senderOff.receiverEnabled).toBe(true);

		// Receiver disables
		const bothOff: OrgInvite = await stub.togglePartnership(inviteToSend.receiver, createdInvite.id);
		expect(bothOff.senderEnabled).toBe(false);
		expect(bothOff.receiverEnabled).toBe(false);
	});

	// Atomic toggle — both mailboxes must be consistent for per-org fields
	it('should handle toggle atomically across both mailboxes', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);

		await stub.respond(inviteToSend.receiver, createdInvite.id, OrgInviteStatusSchema.enum.accepted);

		// Sender toggles ON
		await stub.togglePartnership(inviteToSend.sender, createdInvite.id);

		// Verify both mailboxes are consistent
		const senderInvite: OrgInvite = await stub.read(inviteToSend.sender, createdInvite.id);
		const receiverInvite: OrgInvite = await stub.read(inviteToSend.receiver, createdInvite.id);

		expect(senderInvite.senderEnabled).toBe(receiverInvite.senderEnabled);
		expect(senderInvite.receiverEnabled).toBe(receiverInvite.receiverEnabled);
		expect(senderInvite.senderEnabled).toBe(true);
		expect(senderInvite.receiverEnabled).toBe(false);

		// Receiver toggles ON
		await stub.togglePartnership(inviteToSend.receiver, createdInvite.id);

		const senderAfter: OrgInvite = await stub.read(inviteToSend.sender, createdInvite.id);
		const receiverAfter: OrgInvite = await stub.read(inviteToSend.receiver, createdInvite.id);

		expect(senderAfter.senderEnabled).toBe(receiverAfter.senderEnabled);
		expect(senderAfter.receiverEnabled).toBe(receiverAfter.receiverEnabled);
		expect(senderAfter.senderEnabled).toBe(true);
		expect(senderAfter.receiverEnabled).toBe(true);
	});
});

describe('Invite Management', () => {
	beforeEach(async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// Clear storage before each test
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		// Clear any permission check mocks
		delete (env.AUTHZED as Record<string, unknown>).canUpdateOrgPartnersInOrg;
		delete (env.AUTHZED as Record<string, unknown>).isMemberOfOrg;
	});

	describe('sendInvite', () => {
		it('should successfully send an invite', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			mockGetUser(mockUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const response = await worker.sendInvite(
				inviteToSend.receiver,
				{ cfToken: 'valid-token' },
				inviteToSend.message
			);

			expect(response.success).toBe(true);
			if (!response.success) {
				throw new Error('Failed to send invite');
			}

			const invite = response.data as OrgInvite;
			expect(invite.sender).toBe(inviteToSend.sender);
			expect(invite.receiver).toBe(inviteToSend.receiver);
			expect(invite.message).toBe(inviteToSend.message);
			expect(invite.status).toBe('pending');
			expect(invite.senderEnabled).toBe(false);
			expect(invite.receiverEnabled).toBe(false);
		});

		it('should return error when token is missing', async () => {
			const worker = SELF;
			const response = await worker.sendInvite('test-receiver-org-1', { cfToken: '' }, 'Test invite message');

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('No verifiable credential found');
			}
		});

		it('should return error when user lacks permissions', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			// Add user to org first
			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			mockGetUser(mockUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => false;

			const response = await worker.sendInvite(
				'test-receiver-org-1',
				{ cfToken: 'valid-token' },
				'Test invite message'
			);

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('Permission denied: send org invites');
			}
		});

		it('should return error when trying to invite own organization', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			mockGetUser(mockUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			// Try to invite own organization
			const response = await worker.sendInvite('default', { cfToken: 'valid-token' }, 'Test invite message');

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('Cannot invite your own organization');
			}
		});

		it('should return error when receiving org ID format is invalid', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			mockGetUser(mockUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			// Try to send invite with invalid org ID format (contains special characters)
			const response = await worker.sendInvite(
				'invalid@org#id!',
				{ cfToken: 'valid-token' },
				'Test invite message'
			);

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('Organization ID');
			}
		});

		it('should reject duplicate invite to same organization', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			mockGetUser(mockUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			// Send first invite - should succeed
			const firstResponse = await worker.sendInvite(
				'target-org-duplicate-test',
				{ cfToken: 'valid-token' },
				'First invite'
			);
			expect(firstResponse.success).toBe(true);

			// Send second invite to same org - should fail
			const secondResponse = await worker.sendInvite(
				'target-org-duplicate-test',
				{ cfToken: 'valid-token' },
				'Second invite'
			);

			expect(secondResponse.success).toBe(false);
			if (!secondResponse.success) {
				expect(secondResponse.error).toContain('pending invite to this organization already exists');
			}
		});

		it('should reject invite when reverse direction pending (bidirectional block)', async () => {
			const worker = SELF;

			// Org A sends invite to Org B
			const orgAUser = createMockUser('org-a-bidir-test');
			await env.AUTHZED.addUserToOrg(orgAUser.orgId, orgAUser.userId);
			mockGetUser(orgAUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const firstResponse = await worker.sendInvite(
				'org-b-bidir-test',
				{ cfToken: 'valid-token' },
				'Invite from A to B'
			);
			expect(firstResponse.success).toBe(true);

			// Now Org B tries to send invite to Org A - should fail
			const orgBUser = createMockUser('org-b-bidir-test');
			await env.AUTHZED.addUserToOrg(orgBUser.orgId, orgBUser.userId);
			mockGetUser(orgBUser);

			const secondResponse = await worker.sendInvite(
				'org-a-bidir-test',
				{ cfToken: 'valid-token' },
				'Invite from B to A'
			);

			expect(secondResponse.success).toBe(false);
			if (!secondResponse.success) {
				expect(secondResponse.error).toContain('pending invite from this organization already exists');
			}
		});

		it('should allow new invite after previous one is declined', async () => {
			const worker = SELF;

			// Org A sends invite to Org B
			const orgAUser = createMockUser('org-a-decline-test');
			await env.AUTHZED.addUserToOrg(orgAUser.orgId, orgAUser.userId);
			mockGetUser(orgAUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const firstResponse = await worker.sendInvite(
				'org-b-decline-test',
				{ cfToken: 'valid-token' },
				'First invite'
			);
			expect(firstResponse.success).toBe(true);
			const firstInvite = firstResponse.data as OrgInvite;

			// Org B declines the invite
			const orgBUser = createMockUser('org-b-decline-test');
			await env.AUTHZED.addUserToOrg(orgBUser.orgId, orgBUser.userId);
			mockGetUser(orgBUser);

			const declineResponse = await worker.declineInvite(firstInvite.id, { cfToken: 'valid-token' });
			expect(declineResponse.success).toBe(true);

			// Now Org A can send a new invite
			mockGetUser(orgAUser);
			const secondResponse = await worker.sendInvite(
				'org-b-decline-test',
				{ cfToken: 'valid-token' },
				'Second invite after decline'
			);

			expect(secondResponse.success).toBe(true);
		});
	});

	describe('acceptInvite', () => {
		it('should successfully accept an invite', async () => {
			const worker = SELF;
			const receiverUser = createMockUser('test-receiver-org-1');
			const senderUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);
			await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);

			mockGetUser(senderUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const sendResponse = await worker.sendInvite(
				inviteToSend.receiver,
				{ cfToken: 'valid-token' },
				inviteToSend.message
			);

			expect(sendResponse.success).toBe(true);
			if (!sendResponse.success) {
				throw new Error('Failed to send invite');
			}

			const invite = sendResponse.data as OrgInvite;

			mockGetUser(receiverUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const acceptResponse = await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });

			expect(acceptResponse.success).toBe(true);
			if (!acceptResponse.success) {
				throw new Error('Failed to accept invite');
			}

			const acceptedInvite = acceptResponse.data as OrgInvite;
			expect(acceptedInvite.status).toBe('accepted');
		});

		it('should return error when sender tries to accept their own invite', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			// First send an invite
			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			mockGetUser(mockUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const sendResponse = await worker.sendInvite(
				inviteToSend.receiver,
				{ cfToken: 'valid-token' },
				inviteToSend.message
			);

			expect(sendResponse.success).toBe(true);
			if (!sendResponse.success) {
				throw new Error('Failed to send invite');
			}

			const invite = sendResponse.data as OrgInvite;

			// Try to accept as sender
			const acceptResponse = await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });

			expect(acceptResponse.success).toBe(false);
			if (!acceptResponse.success) {
				expect(acceptResponse.error).toContain('cannot accept their own invite');
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

			mockGetUser(senderUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const sendResponse = await worker.sendInvite(
				inviteToSend.receiver,
				{ cfToken: 'valid-token' },
				inviteToSend.message
			);

			expect(sendResponse.success).toBe(true);
			if (!sendResponse.success) {
				throw new Error('Failed to send invite');
			}

			const invite = sendResponse.data as OrgInvite;

			mockGetUser(receiverUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const declineResponse = await worker.declineInvite(invite.id, { cfToken: 'valid-token' });

			expect(declineResponse.success).toBe(true);
			if (!declineResponse.success) {
				throw new Error('Failed to decline invite');
			}

			const declinedInvite = declineResponse.data as OrgInvite;
			expect(declinedInvite.status).toBe('declined');
		});
	});

	describe('SpiceDB calls on toggle', () => {
		it('should call addPartnerToOrg(sender, receiver) when sender enables', async () => {
			const worker = SELF;
			const senderUser = createMockUser('default');
			const receiverOrg = 'test-receiver-org-1';

			await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);

			// Send invite as sender
			mockGetUser(senderUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;
			const sendResponse = await worker.sendInvite(receiverOrg, { cfToken: 'valid-token' }, 'test');
			expect(sendResponse.success).toBe(true);
			const invite = sendResponse.data as OrgInvite;

			// Accept as receiver
			const receiverUser = createMockUser(receiverOrg);
			await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
			mockGetUser(receiverUser);
			await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });

			// Spy on SpiceDB calls
			const addSpy = vi.fn(async () => {});
			const deleteSpy = vi.fn(async () => {});
			env.AUTHZED.addPartnerToOrg = addSpy;
			env.AUTHZED.deletePartnerInOrg = deleteSpy;

			// Sender toggles ON
			mockGetUser(senderUser);
			const toggleResponse = await worker.togglePartnership(invite.id, { cfToken: 'valid-token' });
			expect(toggleResponse.success).toBe(true);

			// Only addPartnerToOrg(sender, receiver) called
			expect(addSpy).toHaveBeenCalledOnce();
			expect(addSpy).toHaveBeenCalledWith('default', receiverOrg);
			expect(deleteSpy).not.toHaveBeenCalled();
		});

		it('should call addPartnerToOrg(receiver, sender) when receiver enables', async () => {
			const worker = SELF;
			const senderUser = createMockUser('default');
			const receiverOrg = 'test-receiver-org-1';

			await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);

			// Send and accept
			mockGetUser(senderUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;
			const sendResponse = await worker.sendInvite(receiverOrg, { cfToken: 'valid-token' }, 'test');
			const invite = sendResponse.data as OrgInvite;

			const receiverUser = createMockUser(receiverOrg);
			await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
			mockGetUser(receiverUser);
			await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });

			// Spy on SpiceDB calls
			const addSpy = vi.fn(async () => {});
			const deleteSpy = vi.fn(async () => {});
			env.AUTHZED.addPartnerToOrg = addSpy;
			env.AUTHZED.deletePartnerInOrg = deleteSpy;

			// Receiver toggles ON
			mockGetUser(receiverUser);
			const toggleResponse = await worker.togglePartnership(invite.id, { cfToken: 'valid-token' });
			expect(toggleResponse.success).toBe(true);

			// Only addPartnerToOrg(receiver, sender) called
			expect(addSpy).toHaveBeenCalledOnce();
			expect(addSpy).toHaveBeenCalledWith(receiverOrg, 'default');
			expect(deleteSpy).not.toHaveBeenCalled();
		});

		it('should call deletePartnerInOrg when sender disables', async () => {
			const worker = SELF;
			const senderUser = createMockUser('default');
			const receiverOrg = 'test-receiver-org-1';

			await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);

			// Send and accept
			mockGetUser(senderUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;
			const sendResponse = await worker.sendInvite(receiverOrg, { cfToken: 'valid-token' }, 'test');
			const invite = sendResponse.data as OrgInvite;

			const receiverUser = createMockUser(receiverOrg);
			await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
			mockGetUser(receiverUser);
			await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });

			// Sender toggles ON first
			env.AUTHZED.addPartnerToOrg = async () => {};
			env.AUTHZED.deletePartnerInOrg = async () => {};
			mockGetUser(senderUser);
			await worker.togglePartnership(invite.id, { cfToken: 'valid-token' });

			// Now spy and toggle OFF
			const addSpy = vi.fn(async () => {});
			const deleteSpy = vi.fn(async () => {});
			env.AUTHZED.addPartnerToOrg = addSpy;
			env.AUTHZED.deletePartnerInOrg = deleteSpy;

			const toggleResponse = await worker.togglePartnership(invite.id, { cfToken: 'valid-token' });
			expect(toggleResponse.success).toBe(true);

			expect(deleteSpy).toHaveBeenCalledOnce();
			expect(deleteSpy).toHaveBeenCalledWith('default', receiverOrg);
			expect(addSpy).not.toHaveBeenCalled();
		});

		it('should rollback DO state when SpiceDB addPartnerToOrg fails', async () => {
			const worker = SELF;
			const senderUser = createMockUser('default');
			const receiverOrg = 'test-receiver-org-1';

			await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);

			// Send and accept
			mockGetUser(senderUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;
			const sendResponse = await worker.sendInvite(receiverOrg, { cfToken: 'valid-token' }, 'test');
			const invite = sendResponse.data as OrgInvite;

			const receiverUser = createMockUser(receiverOrg);
			await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
			mockGetUser(receiverUser);
			await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });

			// Make SpiceDB throw on addPartnerToOrg
			env.AUTHZED.addPartnerToOrg = async () => {
				throw new Error('SpiceDB unavailable');
			};
			env.AUTHZED.deletePartnerInOrg = async () => {};

			// Sender toggles ON — SpiceDB fails, DO should rollback
			mockGetUser(senderUser);
			const toggleResponse = await worker.togglePartnership(invite.id, { cfToken: 'valid-token' });
			expect(toggleResponse.success).toBe(false);

			// Verify DO state was reverted — both flags should be back to false
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);
			const afterRollback = await stub.read(senderUser.orgId, invite.id);
			expect(afterRollback.senderEnabled).toBe(false);
			expect(afterRollback.receiverEnabled).toBe(false);
		});

		it('should call deletePartnerInOrg(receiver, sender) when receiver disables', async () => {
			const worker = SELF;
			const senderUser = createMockUser('default');
			const receiverOrg = 'test-receiver-org-1';

			await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);

			// Send and accept
			mockGetUser(senderUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;
			const sendResponse = await worker.sendInvite(receiverOrg, { cfToken: 'valid-token' }, 'test');
			const invite = sendResponse.data as OrgInvite;

			const receiverUser = createMockUser(receiverOrg);
			await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
			mockGetUser(receiverUser);
			await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });

			// Receiver toggles ON first
			env.AUTHZED.addPartnerToOrg = async () => {};
			env.AUTHZED.deletePartnerInOrg = async () => {};
			mockGetUser(receiverUser);
			await worker.togglePartnership(invite.id, { cfToken: 'valid-token' });

			// Now spy and toggle OFF
			const addSpy = vi.fn(async () => {});
			const deleteSpy = vi.fn(async () => {});
			env.AUTHZED.addPartnerToOrg = addSpy;
			env.AUTHZED.deletePartnerInOrg = deleteSpy;

			const toggleResponse = await worker.togglePartnership(invite.id, { cfToken: 'valid-token' });
			expect(toggleResponse.success).toBe(true);

			// deletePartnerInOrg(receiver, sender) — receiver's data no longer shared with sender
			expect(deleteSpy).toHaveBeenCalledOnce();
			expect(deleteSpy).toHaveBeenCalledWith(receiverOrg, 'default');
			expect(addSpy).not.toHaveBeenCalled();
		});

		it('should not call addPartnerToOrg on accept', async () => {
			const worker = SELF;
			const senderUser = createMockUser('default');
			const receiverOrg = 'test-receiver-org-1';

			await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);

			mockGetUser(senderUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;
			const sendResponse = await worker.sendInvite(receiverOrg, { cfToken: 'valid-token' }, 'test');
			const invite = sendResponse.data as OrgInvite;

			// Spy on SpiceDB calls
			const addSpy = vi.fn(async () => {});
			env.AUTHZED.addPartnerToOrg = addSpy;

			const receiverUser = createMockUser(receiverOrg);
			await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
			mockGetUser(receiverUser);

			const acceptResponse = await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });
			expect(acceptResponse.success).toBe(true);

			// No SpiceDB calls on accept
			expect(addSpy).not.toHaveBeenCalled();
		});

		it('should unconditionally clean up both directions on decline', async () => {
			const worker = SELF;
			const senderUser = createMockUser('default');
			const receiverOrg = 'test-receiver-org-1';

			await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);

			// Send, accept, then sender enables
			mockGetUser(senderUser);
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;
			const sendResponse = await worker.sendInvite(receiverOrg, { cfToken: 'valid-token' }, 'test');
			const invite = sendResponse.data as OrgInvite;

			const receiverUser = createMockUser(receiverOrg);
			await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
			mockGetUser(receiverUser);
			await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });

			// Sender enables (only sender direction open)
			env.AUTHZED.addPartnerToOrg = async () => {};
			env.AUTHZED.deletePartnerInOrg = async () => {};
			mockGetUser(senderUser);
			await worker.togglePartnership(invite.id, { cfToken: 'valid-token' });

			// Now spy and decline
			const deleteSpy = vi.fn(async () => {});
			env.AUTHZED.deletePartnerInOrg = deleteSpy;

			mockGetUser(senderUser);
			const declineResponse = await worker.declineInvite(invite.id, { cfToken: 'valid-token' });
			expect(declineResponse.success).toBe(true);

			// Both directions cleaned up unconditionally (deletePartnerInOrg is idempotent)
			expect(deleteSpy).toHaveBeenCalledTimes(2);
			expect(deleteSpy).toHaveBeenCalledWith('default', receiverOrg);
			expect(deleteSpy).toHaveBeenCalledWith(receiverOrg, 'default');
		});
	});

	describe('listInvites', () => {
		it('should list all invites for an organization', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			mockGetUser(mockUser);
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

			const listedInvites = listResponse.data as OrgInvite[];
			expect(listedInvites).toHaveLength(invites.length);

			// Verify each invite
			for (let i = 0; i < invites.length; i++) {
				expect(listedInvites[i].sender).toBe(invites[i].sender);
				expect(listedInvites[i].receiver).toBe(invites[i].receiver);
				expect(listedInvites[i].message).toBe(invites[i].message);
				expect(listedInvites[i].status).toBe('pending');
				expect(listedInvites[i].senderEnabled).toBe(false);
				expect(listedInvites[i].receiverEnabled).toBe(false);
			}
		});

		it('should return error when token is missing', async () => {
			const worker = SELF;
			const response = await worker.listInvites({ cfToken: '' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('No verifiable credential found');
			}
		});

		it('should return error when user is not found', async () => {
			const worker = SELF;
			mockGetUser(undefined);

			const response = await worker.listInvites({ cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('Invalid or non-existent user');
			}
		});

		it('should return error when user is not a member of the organization', async () => {
			const worker = SELF;
			const mockUser = createMockUser('non-member-org');

			// Don't add user to org - they should not be a member
			mockGetUser(mockUser);
			// Ensure no mocks are interfering
			delete (env.AUTHZED as Record<string, unknown>).isMemberOfOrg;

			const response = await worker.listInvites({ cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('Permission denied: list org invites');
			}
		});
	});
});

describe('Data Custodian Partner Update Restrictions', () => {
	const testOrgId = 'test-org-custodian-restrictions';
	const dataCustodianUser: User = {
		userId: 'test-data-custodian',
		orgId: testOrgId,
		zitadelRoles: ['data-custodian'] as const,
	} as User;

	beforeEach(async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// Clear storage before each test
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		// Set up data custodian user in AuthZed
		await env.AUTHZED.addDataCustodianToOrg(testOrgId, dataCustodianUser.userId);
		mockGetUser(dataCustodianUser);
		// Ensure no mocks are set for permission checks - use real AuthZed
		delete (env.AUTHZED as Record<string, unknown>).canUpdateOrgPartnersInOrg;
	});

	afterEach(async () => {
		// Cleanup AuthZed
		await env.AUTHZED.deleteDataCustodianFromOrg(testOrgId, dataCustodianUser.userId);
	});

	it('should deny Data Custodian from sending invites', async () => {
		// Ensure no mocks are set - use real AuthZed permission check
		delete (env.AUTHZED as Record<string, unknown>).canUpdateOrgPartnersInOrg;

		// Verify the permission check returns false for Data Custodian
		const hasPermission = await env.AUTHZED.canUpdateOrgPartnersInOrg(testOrgId, dataCustodianUser.userId);
		expect(hasPermission).toBe(false);

		const worker = SELF;
		const response = await worker.sendInvite('test-receiver-org', { cfToken: 'valid-token' }, 'Test message');

		expect(response.success).toBe(false);
		if (!response.success) {
			expect(response.error).toBe('Permission denied: send org invites');
		}
	});

	it('should deny Data Custodian from toggling partnerships', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// Create an invite first (using admin permissions)
		const adminUser: User = {
			userId: 'test-admin',
			orgId: testOrgId,
		} as User;
		await env.AUTHZED.addAdminToOrg(testOrgId, adminUser.userId);
		mockGetUser(adminUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const inviteToSend = generateInvites(1)[0];
		inviteToSend.sender = testOrgId;
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);

		// Now try to toggle as Data Custodian
		mockGetUser(dataCustodianUser);
		// Remove mock to use real AuthZed permission check
		delete (env.AUTHZED as Record<string, unknown>).canUpdateOrgPartnersInOrg;
		const worker = SELF;
		const response = await worker.togglePartnership(createdInvite.id, { cfToken: 'valid-token' });

		expect(response.success).toBe(false);
		if (!response.success) {
			expect(response.error).toBe('Permission denied: update org partners');
		}

		// Cleanup
		await env.AUTHZED.deleteAdminFromOrg(testOrgId, adminUser.userId);
	});

	it('should deny Data Custodian from accepting invites', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// Create an invite first (using admin permissions)
		const adminUser: User = {
			userId: 'test-admin',
			orgId: testOrgId,
		} as User;
		await env.AUTHZED.addAdminToOrg(testOrgId, adminUser.userId);
		mockGetUser(adminUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const inviteToSend = generateInvites(1)[0];
		inviteToSend.sender = 'sender-org';
		inviteToSend.receiver = testOrgId;
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);

		// Now try to accept as Data Custodian
		mockGetUser(dataCustodianUser);
		// Remove mock to use real AuthZed permission check
		delete (env.AUTHZED as Record<string, unknown>).canUpdateOrgPartnersInOrg;
		const worker = SELF;
		const response = await worker.acceptInvite(createdInvite.id, { cfToken: 'valid-token' });

		expect(response.success).toBe(false);
		if (!response.success) {
			expect(response.error).toBe('Permission denied: accept org invites');
		}

		// Cleanup
		await env.AUTHZED.deleteAdminFromOrg(testOrgId, adminUser.userId);
	});

	it('should deny Data Custodian from declining invites', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// Create an invite first (using admin permissions)
		const adminUser: User = {
			userId: 'test-admin',
			orgId: testOrgId,
		} as User;
		await env.AUTHZED.addAdminToOrg(testOrgId, adminUser.userId);
		mockGetUser(adminUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const inviteToSend = generateInvites(1)[0];
		inviteToSend.sender = 'sender-org';
		inviteToSend.receiver = testOrgId;
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);

		// Now try to decline as Data Custodian
		mockGetUser(dataCustodianUser);
		// Remove mock to use real AuthZed permission check
		delete (env.AUTHZED as Record<string, unknown>).canUpdateOrgPartnersInOrg;
		const worker = SELF;
		const response = await worker.declineInvite(createdInvite.id, { cfToken: 'valid-token' });

		expect(response.success).toBe(false);
		if (!response.success) {
			expect(response.error).toBe('Permission denied: decline org invites');
		}

		// Cleanup
		await env.AUTHZED.deleteAdminFromOrg(testOrgId, adminUser.userId);
	});

	it('should deny Data Custodian from reading invites', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// Create an invite first (using admin permissions)
		const adminUser: User = {
			userId: 'test-admin',
			orgId: testOrgId,
		} as User;
		await env.AUTHZED.addAdminToOrg(testOrgId, adminUser.userId);
		mockGetUser(adminUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const inviteToSend = generateInvites(1)[0];
		inviteToSend.sender = testOrgId;
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);

		// Now try to read as Data Custodian
		mockGetUser(dataCustodianUser);
		// Remove mock to use real AuthZed permission check
		delete (env.AUTHZED as Record<string, unknown>).canUpdateOrgPartnersInOrg;
		const worker = SELF;
		const response = await worker.readInvite(createdInvite.id, { cfToken: 'valid-token' });

		expect(response.success).toBe(false);
		if (!response.success) {
			expect(response.error).toBe('Permission denied: update org partners');
		}

		// Cleanup
		await env.AUTHZED.deleteAdminFromOrg(testOrgId, adminUser.userId);
	});

	it('should allow Data Custodian to list invites (read-only operation)', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// Create an invite first (using admin permissions)
		const adminUser: User = {
			userId: 'test-admin',
			orgId: testOrgId,
		} as User;
		await env.AUTHZED.addAdminToOrg(testOrgId, adminUser.userId);
		mockGetUser(adminUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const inviteToSend = generateInvites(1)[0];
		inviteToSend.sender = testOrgId;
		const createdInvite: OrgInvite = await stub.send(
			inviteToSend.sender,
			inviteToSend.receiver,
			inviteToSend.message
		);

		// Now try to list as Data Custodian - should succeed since they're a member
		mockGetUser(dataCustodianUser);
		const worker = SELF;
		const response = await worker.listInvites({ cfToken: 'valid-token' });

		expect(response.success).toBe(true);
		if (response.success) {
			const invites = response.data as OrgInvite[];
			expect(invites.length).toBeGreaterThan(0);
			// Verify the invite we created is in the list
			expect(invites.some((inv) => inv.id === createdInvite.id)).toBe(true);
		}

		// Cleanup
		await env.AUTHZED.deleteAdminFromOrg(testOrgId, adminUser.userId);
	});
});

describe('DO storage migration (old-format data)', () => {
	it('should migrate old-format isActive/disabledBy data on list and read', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		const oldFormatInvite = {
			id: 'old-format-invite-1',
			status: 'accepted',
			sender: 'org-alpha',
			receiver: 'org-beta',
			message: 'legacy invite',
			isActive: true,
			disabledBy: null,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		// Seed old-format data directly into DO storage
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
			await state.storage.put('org-alpha', [oldFormatInvite]);
			await state.storage.put('org-beta', [oldFormatInvite]);
		});

		// list() should return migrated data
		const listed = await stub.list('org-alpha');
		expect(listed).toHaveLength(1);
		expect(listed[0].senderEnabled).toBe(true);
		expect(listed[0].receiverEnabled).toBe(true);
		expect(listed[0]).not.toHaveProperty('isActive');
		expect(listed[0]).not.toHaveProperty('disabledBy');

		// read() should return migrated data
		const read = await stub.read('org-alpha', 'old-format-invite-1');
		expect(read.senderEnabled).toBe(true);
		expect(read.receiverEnabled).toBe(true);
	});

	it('should migrate old-format isActive: false to both disabled', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		const oldFormatInvite = {
			id: 'old-format-invite-2',
			status: 'accepted',
			sender: 'org-alpha',
			receiver: 'org-beta',
			message: 'disabled legacy invite',
			isActive: false,
			disabledBy: 'org-alpha',
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
			await state.storage.put('org-alpha', [oldFormatInvite]);
		});

		const listed = await stub.list('org-alpha');
		expect(listed).toHaveLength(1);
		expect(listed[0].senderEnabled).toBe(false);
		expect(listed[0].receiverEnabled).toBe(false);
	});
});

describe('Old-format data: write operations and SpiceDB integration', () => {
	const SENDER = 'org-sender';
	const RECEIVER = 'org-receiver';

	beforeEach(async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		delete (env.AUTHZED as Record<string, unknown>).canUpdateOrgPartnersInOrg;
	});

	// Test 1: Sender toggles off on isActive: true
	it('sender toggles off on isActive: true → deletePartnerInOrg(sender, receiver)', async () => {
		const worker = SELF;
		const senderUser = createMockUser(SENDER);
		const invite = createOldFormatInvite({ id: 'old-1', sender: SENDER, receiver: RECEIVER, isActive: true });

		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.put(SENDER, [invite]);
			await state.storage.put(RECEIVER, [invite]);
		});

		await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);
		mockGetUser(senderUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const addSpy = vi.fn(async () => {});
		const deleteSpy = vi.fn(async () => {});
		env.AUTHZED.addPartnerToOrg = addSpy;
		env.AUTHZED.deletePartnerInOrg = deleteSpy;

		const response = await worker.togglePartnership('old-1', { cfToken: 'valid-token' });
		expect(response.success).toBe(true);

		const toggled = (response as { success: true; data: OrgInvite }).data;
		expect(toggled.senderEnabled).toBe(false);
		expect(toggled.receiverEnabled).toBe(true);

		expect(deleteSpy).toHaveBeenCalledOnce();
		expect(deleteSpy).toHaveBeenCalledWith(SENDER, RECEIVER);
		expect(addSpy).not.toHaveBeenCalled();
	});

	// Test 2: Receiver toggles off on isActive: true
	it('receiver toggles off on isActive: true → deletePartnerInOrg(receiver, sender)', async () => {
		const worker = SELF;
		const receiverUser = createMockUser(RECEIVER);
		const invite = createOldFormatInvite({ id: 'old-2', sender: SENDER, receiver: RECEIVER, isActive: true });

		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.put(SENDER, [invite]);
			await state.storage.put(RECEIVER, [invite]);
		});

		await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
		mockGetUser(receiverUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const addSpy = vi.fn(async () => {});
		const deleteSpy = vi.fn(async () => {});
		env.AUTHZED.addPartnerToOrg = addSpy;
		env.AUTHZED.deletePartnerInOrg = deleteSpy;

		const response = await worker.togglePartnership('old-2', { cfToken: 'valid-token' });
		expect(response.success).toBe(true);

		const toggled = (response as { success: true; data: OrgInvite }).data;
		expect(toggled.senderEnabled).toBe(true);
		expect(toggled.receiverEnabled).toBe(false);

		expect(deleteSpy).toHaveBeenCalledOnce();
		expect(deleteSpy).toHaveBeenCalledWith(RECEIVER, SENDER);
		expect(addSpy).not.toHaveBeenCalled();
	});

	// Test 3: Sender toggles on from isActive: false, disabledBy: sender
	it('sender toggles on from isActive: false, disabledBy: sender → addPartnerToOrg(sender, receiver)', async () => {
		const worker = SELF;
		const senderUser = createMockUser(SENDER);
		const invite = createOldFormatInvite({
			id: 'old-3',
			sender: SENDER,
			receiver: RECEIVER,
			isActive: false,
			disabledBy: SENDER,
		});

		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.put(SENDER, [invite]);
			await state.storage.put(RECEIVER, [invite]);
		});

		await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);
		mockGetUser(senderUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const addSpy = vi.fn(async () => {});
		const deleteSpy = vi.fn(async () => {});
		env.AUTHZED.addPartnerToOrg = addSpy;
		env.AUTHZED.deletePartnerInOrg = deleteSpy;

		const response = await worker.togglePartnership('old-3', { cfToken: 'valid-token' });
		expect(response.success).toBe(true);

		const toggled = (response as { success: true; data: OrgInvite }).data;
		expect(toggled.senderEnabled).toBe(true);
		expect(toggled.receiverEnabled).toBe(false);

		expect(addSpy).toHaveBeenCalledOnce();
		expect(addSpy).toHaveBeenCalledWith(SENDER, RECEIVER);
		expect(deleteSpy).not.toHaveBeenCalled();
	});

	// Test 4: Tug-of-war liberation — receiver toggles on from isActive: false, disabledBy: sender
	it('tug-of-war liberation: receiver toggles on from isActive: false, disabledBy: sender', async () => {
		const worker = SELF;
		const receiverUser = createMockUser(RECEIVER);
		const invite = createOldFormatInvite({
			id: 'old-4',
			sender: SENDER,
			receiver: RECEIVER,
			isActive: false,
			disabledBy: SENDER,
		});

		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.put(SENDER, [invite]);
			await state.storage.put(RECEIVER, [invite]);
		});

		await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
		mockGetUser(receiverUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const addSpy = vi.fn(async () => {});
		const deleteSpy = vi.fn(async () => {});
		env.AUTHZED.addPartnerToOrg = addSpy;
		env.AUTHZED.deletePartnerInOrg = deleteSpy;

		const response = await worker.togglePartnership('old-4', { cfToken: 'valid-token' });
		expect(response.success).toBe(true);

		const toggled = (response as { success: true; data: OrgInvite }).data;
		expect(toggled.receiverEnabled).toBe(true);

		expect(addSpy).toHaveBeenCalledOnce();
		expect(addSpy).toHaveBeenCalledWith(RECEIVER, SENDER);
		expect(deleteSpy).not.toHaveBeenCalled();
	});

	// Test 5: Decline on isActive: true triggers bidirectional cleanup
	it('decline on isActive: true triggers bidirectional SpiceDB cleanup', async () => {
		const worker = SELF;
		const senderUser = createMockUser(SENDER);
		const invite = createOldFormatInvite({ id: 'old-5', sender: SENDER, receiver: RECEIVER, isActive: true });

		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.put(SENDER, [invite]);
			await state.storage.put(RECEIVER, [invite]);
		});

		await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);
		mockGetUser(senderUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const deleteSpy = vi.fn(async () => {});
		env.AUTHZED.deletePartnerInOrg = deleteSpy;

		const response = await worker.declineInvite('old-5', { cfToken: 'valid-token' });
		expect(response.success).toBe(true);

		const declined = (response as { success: true; data: OrgInvite }).data;
		expect(declined.status).toBe('declined');

		expect(deleteSpy).toHaveBeenCalledTimes(2);
		expect(deleteSpy).toHaveBeenCalledWith(SENDER, RECEIVER);
		expect(deleteSpy).toHaveBeenCalledWith(RECEIVER, SENDER);

		// Verify mailboxes are empty
		const senderList = await stub.list(SENDER);
		const receiverList = await stub.list(RECEIVER);
		expect(senderList).toHaveLength(0);
		expect(receiverList).toHaveLength(0);
	});

	// Test 6: Decline on isActive: false still cleans up (idempotent)
	it('decline on isActive: false still cleans up both SpiceDB directions', async () => {
		const worker = SELF;
		const receiverUser = createMockUser(RECEIVER);
		const invite = createOldFormatInvite({
			id: 'old-6',
			sender: SENDER,
			receiver: RECEIVER,
			isActive: false,
			disabledBy: SENDER,
		});

		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.put(SENDER, [invite]);
			await state.storage.put(RECEIVER, [invite]);
		});

		await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
		mockGetUser(receiverUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const deleteSpy = vi.fn(async () => {});
		env.AUTHZED.deletePartnerInOrg = deleteSpy;

		const response = await worker.declineInvite('old-6', { cfToken: 'valid-token' });
		expect(response.success).toBe(true);

		expect(deleteSpy).toHaveBeenCalledTimes(2);
		expect(deleteSpy).toHaveBeenCalledWith(SENDER, RECEIVER);
		expect(deleteSpy).toHaveBeenCalledWith(RECEIVER, SENDER);

		const senderList = await stub.list(SENDER);
		const receiverList = await stub.list(RECEIVER);
		expect(senderList).toHaveLength(0);
		expect(receiverList).toHaveLength(0);
	});

	// Test 7: Mixed mailbox — old + new format invites coexist
	it('mixed mailbox: old-format invite toggled correctly, new-format invite untouched', async () => {
		const worker = SELF;
		const senderUser = createMockUser(SENDER);

		const oldInvite = createOldFormatInvite({ id: 'old-7', sender: SENDER, receiver: RECEIVER, isActive: true });
		const newInvite: OrgInvite = {
			id: 'new-7',
			status: 'accepted',
			sender: SENDER,
			receiver: 'org-other',
			message: 'new format',
			senderEnabled: true,
			receiverEnabled: false,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.put(SENDER, [oldInvite, newInvite]);
			await state.storage.put(RECEIVER, [oldInvite]);
		});

		await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);
		mockGetUser(senderUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		const addSpy = vi.fn(async () => {});
		const deleteSpy = vi.fn(async () => {});
		env.AUTHZED.addPartnerToOrg = addSpy;
		env.AUTHZED.deletePartnerInOrg = deleteSpy;

		// Toggle the old invite (sender toggles off from migrated isActive: true)
		const response = await worker.togglePartnership('old-7', { cfToken: 'valid-token' });
		expect(response.success).toBe(true);

		const toggled = (response as { success: true; data: OrgInvite }).data;
		expect(toggled.senderEnabled).toBe(false);
		expect(toggled.receiverEnabled).toBe(true);

		// Verify the new-format invite is untouched
		const afterList = await stub.list(SENDER);
		const untouched = afterList.find((i) => i.id === 'new-7');
		expect(untouched).toBeDefined();
		expect(untouched!.senderEnabled).toBe(true);
		expect(untouched!.receiverEnabled).toBe(false);
	});

	// Test 8: Sequential toggle round-trip on old data
	it('sequential toggle round-trip on old data produces correct SpiceDB calls', async () => {
		const worker = SELF;
		const senderUser = createMockUser(SENDER);
		const receiverUser = createMockUser(RECEIVER);
		const invite = createOldFormatInvite({ id: 'old-8', sender: SENDER, receiver: RECEIVER, isActive: true });

		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.put(SENDER, [invite]);
			await state.storage.put(RECEIVER, [invite]);
		});

		await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);
		await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		// Step 1: Sender toggles OFF (from migrated true,true → false,true)
		let addSpy = vi.fn(async () => {});
		let deleteSpy = vi.fn(async () => {});
		env.AUTHZED.addPartnerToOrg = addSpy;
		env.AUTHZED.deletePartnerInOrg = deleteSpy;

		mockGetUser(senderUser);
		const step1 = await worker.togglePartnership('old-8', { cfToken: 'valid-token' });
		expect(step1.success).toBe(true);
		expect((step1 as { success: true; data: OrgInvite }).data.senderEnabled).toBe(false);
		expect((step1 as { success: true; data: OrgInvite }).data.receiverEnabled).toBe(true);
		expect(deleteSpy).toHaveBeenCalledWith(SENDER, RECEIVER);

		// Step 2: Receiver toggles OFF (false,true → false,false)
		addSpy = vi.fn(async () => {});
		deleteSpy = vi.fn(async () => {});
		env.AUTHZED.addPartnerToOrg = addSpy;
		env.AUTHZED.deletePartnerInOrg = deleteSpy;

		mockGetUser(receiverUser);
		const step2 = await worker.togglePartnership('old-8', { cfToken: 'valid-token' });
		expect(step2.success).toBe(true);
		expect((step2 as { success: true; data: OrgInvite }).data.senderEnabled).toBe(false);
		expect((step2 as { success: true; data: OrgInvite }).data.receiverEnabled).toBe(false);
		expect(deleteSpy).toHaveBeenCalledWith(RECEIVER, SENDER);

		// Step 3: Sender toggles ON (false,false → true,false)
		addSpy = vi.fn(async () => {});
		deleteSpy = vi.fn(async () => {});
		env.AUTHZED.addPartnerToOrg = addSpy;
		env.AUTHZED.deletePartnerInOrg = deleteSpy;

		mockGetUser(senderUser);
		const step3 = await worker.togglePartnership('old-8', { cfToken: 'valid-token' });
		expect(step3.success).toBe(true);
		expect((step3 as { success: true; data: OrgInvite }).data.senderEnabled).toBe(true);
		expect((step3 as { success: true; data: OrgInvite }).data.receiverEnabled).toBe(false);
		expect(addSpy).toHaveBeenCalledWith(SENDER, RECEIVER);

		// Step 4: Receiver toggles ON (true,false → true,true)
		addSpy = vi.fn(async () => {});
		deleteSpy = vi.fn(async () => {});
		env.AUTHZED.addPartnerToOrg = addSpy;
		env.AUTHZED.deletePartnerInOrg = deleteSpy;

		mockGetUser(receiverUser);
		const step4 = await worker.togglePartnership('old-8', { cfToken: 'valid-token' });
		expect(step4.success).toBe(true);
		expect((step4 as { success: true; data: OrgInvite }).data.senderEnabled).toBe(true);
		expect((step4 as { success: true; data: OrgInvite }).data.receiverEnabled).toBe(true);
		expect(addSpy).toHaveBeenCalledWith(RECEIVER, SENDER);

		// Verify final state via DO read
		const final = await stub.read(SENDER, 'old-8');
		expect(final.senderEnabled).toBe(true);
		expect(final.receiverEnabled).toBe(true);
	});

	// Test 9: SpiceDB rollback on old isActive: false data
	it('SpiceDB add failure on old isActive: false data rolls back senderEnabled', async () => {
		const worker = SELF;
		const senderUser = createMockUser(SENDER);
		const invite = createOldFormatInvite({
			id: 'old-9',
			sender: SENDER,
			receiver: RECEIVER,
			isActive: false,
			disabledBy: SENDER,
		});

		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.put(SENDER, [invite]);
			await state.storage.put(RECEIVER, [invite]);
		});

		await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);
		mockGetUser(senderUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		env.AUTHZED.addPartnerToOrg = async () => {
			throw new Error('SpiceDB unavailable');
		};
		env.AUTHZED.deletePartnerInOrg = async () => {};

		const response = await worker.togglePartnership('old-9', { cfToken: 'valid-token' });
		expect(response.success).toBe(false);

		// DO state should be reverted — senderEnabled back to false
		const afterRollback = await stub.read(SENDER, 'old-9');
		expect(afterRollback.senderEnabled).toBe(false);
		expect(afterRollback.receiverEnabled).toBe(false);
	});

	// Test 10: SpiceDB rollback on old isActive: true data
	it('SpiceDB delete failure on old isActive: true data rolls back senderEnabled', async () => {
		const worker = SELF;
		const senderUser = createMockUser(SENDER);
		const invite = createOldFormatInvite({ id: 'old-10', sender: SENDER, receiver: RECEIVER, isActive: true });

		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.put(SENDER, [invite]);
			await state.storage.put(RECEIVER, [invite]);
		});

		await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);
		mockGetUser(senderUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

		env.AUTHZED.addPartnerToOrg = async () => {};
		env.AUTHZED.deletePartnerInOrg = async () => {
			throw new Error('SpiceDB unavailable');
		};

		// Sender toggles OFF on migrated isActive: true — SpiceDB delete fails
		const response = await worker.togglePartnership('old-10', { cfToken: 'valid-token' });
		expect(response.success).toBe(false);

		// DO state should be reverted — senderEnabled back to true
		const afterRollback = await stub.read(SENDER, 'old-10');
		expect(afterRollback.senderEnabled).toBe(true);
		expect(afterRollback.receiverEnabled).toBe(true);
	});
});

describe('declineInvite SpiceDB fault tolerance', () => {
	beforeEach(async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		delete (env.AUTHZED as Record<string, unknown>).canUpdateOrgPartnersInOrg;
	});

	it('should return success even when SpiceDB deletePartnerInOrg throws', async () => {
		const worker = SELF;
		const senderUser = createMockUser('default');
		const receiverOrg = 'test-receiver-org-1';

		await env.AUTHZED.addUserToOrg(senderUser.orgId, senderUser.userId);

		// Send invite
		mockGetUser(senderUser);
		env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;
		const sendResponse = await worker.sendInvite(receiverOrg, { cfToken: 'valid-token' }, 'test');
		expect(sendResponse.success).toBe(true);
		const invite = sendResponse.data as OrgInvite;

		// Accept as receiver
		const receiverUser = createMockUser(receiverOrg);
		await env.AUTHZED.addUserToOrg(receiverUser.orgId, receiverUser.userId);
		mockGetUser(receiverUser);
		await worker.acceptInvite(invite.id, { cfToken: 'valid-token' });

		// Make SpiceDB throw on deletePartnerInOrg
		env.AUTHZED.deletePartnerInOrg = async () => {
			throw new Error('SpiceDB unavailable');
		};

		// Decline should still succeed (DO deletion is source of truth)
		mockGetUser(receiverUser);
		const declineResponse = await worker.declineInvite(invite.id, { cfToken: 'valid-token' });
		expect(declineResponse.success).toBe(true);
		if (declineResponse.success) {
			const declinedInvite = declineResponse.data as OrgInvite;
			expect(declinedInvite.status).toBe('declined');
		}
	});
});

describe('OrgInviteStoredSchema migration', () => {
	const base = {
		id: 'test-id',
		status: 'accepted' as const,
		sender: 'org-a',
		receiver: 'org-b',
		message: 'hello',
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};

	it('should migrate old format isActive: true to both enabled', () => {
		const result = OrgInviteStoredSchema.parse({ ...base, isActive: true });
		expect(result.senderEnabled).toBe(true);
		expect(result.receiverEnabled).toBe(true);
	});

	it('should migrate old format isActive: false to both disabled', () => {
		const result = OrgInviteStoredSchema.parse({ ...base, isActive: false });
		expect(result.senderEnabled).toBe(false);
		expect(result.receiverEnabled).toBe(false);
	});

	it('should pass through new format values unchanged', () => {
		const result = OrgInviteStoredSchema.parse({ ...base, senderEnabled: true, receiverEnabled: false });
		expect(result.senderEnabled).toBe(true);
		expect(result.receiverEnabled).toBe(false);
	});

	it('should default missing field to false in partial migration', () => {
		const result = OrgInviteStoredSchema.parse({ ...base, senderEnabled: true });
		expect(result.senderEnabled).toBe(true);
		expect(result.receiverEnabled).toBe(false);
	});

	it('should default to both disabled when no toggle fields present', () => {
		const result = OrgInviteStoredSchema.parse({ ...base });
		expect(result.senderEnabled).toBe(false);
		expect(result.receiverEnabled).toBe(false);
	});

	it('should prefer new fields over isActive when both are present', () => {
		const result = OrgInviteStoredSchema.parse({
			...base,
			isActive: true,
			senderEnabled: false,
			receiverEnabled: false,
		});
		expect(result.senderEnabled).toBe(false);
		expect(result.receiverEnabled).toBe(false);
	});

	it('should discard disabledBy even when isActive is true', () => {
		const result = OrgInviteStoredSchema.parse({ ...base, isActive: true, disabledBy: 'org-x' });
		expect(result.senderEnabled).toBe(true);
		expect(result.receiverEnabled).toBe(true);
		expect(result).not.toHaveProperty('disabledBy');
	});
});
