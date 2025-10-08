// test/index.spec.ts
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { describe, expect, it, beforeEach } from 'vitest';
import { OrgInvite, OrgInviteStatusSchema, User } from '@catalyst/schemas';

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

		const createdInvite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
		expect(createdInvite).toBeDefined();

		const acceptedInvite: OrgInvite = await stub.respond(inviteToSend.receiver, createdInvite.id, OrgInviteStatusSchema.enum.accepted);
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

		const createdInvite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
		expect(createdInvite).toBeDefined();

		const declinedInvite: OrgInvite = await stub.respond(inviteToSend.receiver, createdInvite.id, OrgInviteStatusSchema.enum.declined);
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

		const createdInvite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
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

	// be able to toggle an invite
	it('should be able to toggle an invite', async () => {
		const id = env.ORG_MATCHMAKING.idFromName('default');
		const stub = env.ORG_MATCHMAKING.get(id);

		// clear the storage if any invites are present
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			await state.storage.deleteAll();
		});

		const inviteToSend = generateInvites(1)[0];

		const createdInvite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
		expect(createdInvite).toBeDefined();

		// get the invite from the sender's mailbox
		// validate that status is pending
		const readInvite: OrgInvite = await stub.read(inviteToSend.sender, createdInvite.id);
		expect(readInvite.status).toBe(OrgInviteStatusSchema.enum.pending);

		const toggledInvite: OrgInvite = await stub.togglePartnership('default', createdInvite.id);

		// validate that the invite is toggled
		expect(toggledInvite.isActive).toBe(!readInvite.isActive);
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
		const createdInvite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
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

		// Create and send multiple invites
		const invites = generateInvites(3).map((invite) => ({
			...invite,
			receiver: 'test-receiver-org', // Override receiver to be the same for all invites
		}));

		const sentInvites: OrgInvite[] = [];
		for (const invite of invites) {
			const createdInvite: OrgInvite = await stub.send(invite.sender, invite.receiver, invite.message);
			sentInvites.push(createdInvite);
		}

		// Get the invite from both mailboxes before toggle
		const senderReadInvite: OrgInvite = await stub.read(invites[1].sender, sentInvites[1].id);
		const receiverReadInvite: OrgInvite = await stub.read(invites[1].receiver, sentInvites[1].id);
		expect(senderReadInvite.isActive).toBe(true);
		expect(receiverReadInvite.isActive).toBe(true);

		// Toggle the invite
		const toggledInvite: OrgInvite = await stub.togglePartnership(invites[1].sender, sentInvites[1].id);
		expect(toggledInvite.isActive).toBe(false);

		// Verify the toggle in both mailboxes
		const receiverMailboxInvites: OrgInvite[] = await stub.list(invites[1].receiver);
		const senderMailboxInvites: OrgInvite[] = await stub.list(invites[1].sender);

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
		const createdInvite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
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
		const createdInvite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
		expect(createdInvite).toBeDefined();

		// Manually delete the invite from the sender's mailbox to simulate inconsistency
		await runInDurableObject(stub, async (_: unknown, state: DurableObjectState) => {
			const senderMailbox = ((await state.storage.get(inviteToSend.sender)) as OrgInvite[]) ?? [];
			await state.storage.put(
				inviteToSend.sender,
				senderMailbox.filter((i: OrgInvite) => i.id !== createdInvite.id),
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
			const createdInvite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
			expect(createdInvite).toBeDefined();

			const mockUser: User = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;

			// Mock the USERCACHE binding used inside the worker
			env.USERCACHE.getUser = async () => mockUser;
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
			env.USERCACHE.getUser = async () => undefined;

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

			// Create an invite first
			const inviteToSend = generateInvites(1)[0];
			const createdInvite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
			expect(createdInvite).toBeDefined();

			// Mock the USERCACHE binding with a user
			const mockUser = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;
			env.USERCACHE.getUser = async () => mockUser;
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

		it('should successfully toggle an invite from active to inactive', async () => {
			const id = env.ORG_MATCHMAKING.idFromName('default');
			const stub = env.ORG_MATCHMAKING.get(id);

			// Create an invite
			const inviteToSend = generateInvites(1)[0];
			const createdInvite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
			expect(createdInvite).toBeDefined();

			// Mock the USERCACHE binding with a user
			const mockUser = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;

			await env.AUTHZED.addUserToOrg(inviteToSend.sender, mockUser.userId);

			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			// Toggle the invite using the worker
			const worker = SELF;
			const response = await worker.togglePartnership(createdInvite.id, { cfToken: 'valid-token' });
			expect(response.success).toBe(true);
			if (!response.success) {
				throw new Error('Failed to toggle invite');
			}

			// Verify the toggle
			const toggledInvite = response.data as OrgInvite;
			expect(toggledInvite.isActive).toBe(false);
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
			env.USERCACHE.getUser = async () => undefined;

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
			const createdInvite: OrgInvite = await stub.send(inviteToSend.sender, inviteToSend.receiver, inviteToSend.message);
			expect(createdInvite).toBeDefined();

			// Mock the USERCACHE binding with a user
			const mockUser = {
				userId: 'test-user',
				orgId: inviteToSend.sender,
			} as User;
			env.USERCACHE.getUser = async () => mockUser;
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
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const worker = SELF;
			const response = await worker.togglePartnership('non-existent-id', { cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toContain('not found');
			}
		});
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
	});

	describe('sendInvite', () => {
		it('should successfully send an invite', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const response = await worker.sendInvite(inviteToSend.receiver, { cfToken: 'valid-token' }, inviteToSend.message);

			expect(response.success).toBe(true);
			if (!response.success) {
				throw new Error('Failed to send invite');
			}

			const invite = response.data as OrgInvite;
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
				expect(response.error).toBe('No verifiable credential found');
			}
		});

		it('should return error when user lacks permissions', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			// Add user to org first
			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => false;

			const response = await worker.sendInvite('test-receiver-org-1', { cfToken: 'valid-token' }, 'Test invite message');

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('Permission denied: send org invites');
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

			env.USERCACHE.getUser = async () => senderUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const sendResponse = await worker.sendInvite(inviteToSend.receiver, { cfToken: 'valid-token' }, inviteToSend.message);

			expect(sendResponse.success).toBe(true);
			if (!sendResponse.success) {
				throw new Error('Failed to send invite');
			}

			const invite = sendResponse.data as OrgInvite;

			env.USERCACHE.getUser = async () => receiverUser;
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
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const sendResponse = await worker.sendInvite(inviteToSend.receiver, { cfToken: 'valid-token' }, inviteToSend.message);

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

			env.USERCACHE.getUser = async () => senderUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => true;

			const inviteToSend = generateInvites(1)[0];
			const sendResponse = await worker.sendInvite(inviteToSend.receiver, { cfToken: 'valid-token' }, inviteToSend.message);

			expect(sendResponse.success).toBe(true);
			if (!sendResponse.success) {
				throw new Error('Failed to send invite');
			}

			const invite = sendResponse.data as OrgInvite;

			env.USERCACHE.getUser = async () => receiverUser;
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

	describe('listInvites', () => {
		it('should list all invites for an organization', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
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

			const listedInvites = listResponse.data as OrgInvite[];
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
				expect(response.error).toBe('No verifiable credential found');
			}
		});

		it('should return error when user is not found', async () => {
			const worker = SELF;
			env.USERCACHE.getUser = async () => undefined;

			const response = await worker.listInvites({ cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('Invalid or non-existent user');
			}
		});

		it('should return error when user lacks permissions', async () => {
			const worker = SELF;
			const mockUser = createMockUser('default');

			// Add user to org first
			await env.AUTHZED.addUserToOrg(mockUser.orgId, mockUser.userId);
			env.USERCACHE.getUser = async () => mockUser;
			env.AUTHZED.canUpdateOrgPartnersInOrg = async () => false;

			const response = await worker.listInvites({ cfToken: 'valid-token' });

			expect(response.success).toBe(false);
			if (!response.success) {
				expect(response.error).toBe('Permission denied: list org invites');
			}
		});
	});
});
