// test/channel-share.spec.ts
// Integration tests for channel share (granular permissions) functionality

import { SELF } from 'cloudflare:test';
import { describe, expect, it, beforeEach } from 'vitest';

describe('Channel Share Integration Tests', () => {
	// Test data
	const testOrg1 = 'test-org-1';
	const testOrg2 = 'test-org-2';
	const testOrg3 = 'test-org-3';
	const testChannel1 = 'test-channel-1';
	const testChannel2 = 'test-channel-2';
	const testUser1 = 'user1@example.com';
	const testUser2 = 'user2@example.com';

	beforeEach(async () => {
		// Cleanup: Remove any existing channel shares from previous tests
		// This ensures test isolation
		const channel1Partners = await SELF.listChannelPartners(testChannel1);
		for (const partner of channel1Partners) {
			await SELF.removeChannelShare(testChannel1, partner);
		}

		const channel2Partners = await SELF.listChannelPartners(testChannel2);
		for (const partner of channel2Partners) {
			await SELF.removeChannelShare(testChannel2, partner);
		}

		// Cleanup: Remove any existing partnerships for testOrg1
		const org1Partners = await SELF.listPartnersInOrg(testOrg1);
		for (const partner of org1Partners) {
			await SELF.deletePartnerInOrg(testOrg1, partner.subject);
		}

		// Setup: Create organizations with channels
		// Org1 owns channel1 and channel2
		await SELF.addOrgToDataChannel(testChannel1, testOrg1);
		await SELF.addOrgToDataChannel(testChannel2, testOrg1);

		// Add users to organizations
		await SELF.addUserToOrg(testOrg1, testUser1);
		await SELF.addUserToOrg(testOrg2, testUser2);
	});

	// ==================================================================================
	// addChannelShare Tests
	// ==================================================================================

	describe('addChannelShare', () => {
		it('should successfully create a channel share', async () => {
			const result = await SELF.addChannelShare(testChannel1, testOrg2);

			expect(result).toBeDefined();
			expect(result.writtenAt).toBeDefined();

			// Verify the share exists
			const exists = await SELF.channelShareExists(testChannel1, testOrg2);
			expect(exists).toBe(true);
		});

		it('should be idempotent - adding same share twice succeeds', async () => {
			// First add
			const result1 = await SELF.addChannelShare(testChannel1, testOrg2);
			expect(result1).toBeDefined();

			// Second add (should not fail due to TOUCH operation)
			const result2 = await SELF.addChannelShare(testChannel1, testOrg2);
			expect(result2).toBeDefined();
			expect(result2.writtenAt).toBeDefined();
		});

		it('should create bidirectional relationships (channel and partner)', async () => {
			await SELF.addChannelShare(testChannel1, testOrg2);

			// Verify from channel perspective
			const partners = await SELF.listChannelPartners(testChannel1);
			expect(partners).toContain(testOrg2);

			// Verify from partner perspective
			const channels = await SELF.listPartnerChannels(testOrg2);
			expect(channels).toContain(testChannel1);
		});
	});

	// ==================================================================================
	// removeChannelShare Tests
	// ==================================================================================

	describe('removeChannelShare', () => {
		it('should successfully remove an existing share', async () => {
			// Setup: Create a share first
			await SELF.addChannelShare(testChannel1, testOrg2);
			expect(await SELF.channelShareExists(testChannel1, testOrg2)).toBe(true);

			// Remove the share
			const result = await SELF.removeChannelShare(testChannel1, testOrg2);
			expect(result).toBeDefined();
			expect(result.deletedAt).toBeDefined();

			// Verify the share no longer exists
			const exists = await SELF.channelShareExists(testChannel1, testOrg2);
			expect(exists).toBe(false);
		});

		it('should be idempotent - removing non-existent share succeeds', async () => {
			// Remove a share that doesn't exist
			const result = await SELF.removeChannelShare(testChannel1, testOrg3);

			// Should succeed (AuthZed delete is idempotent)
			expect(result).toBeDefined();
			expect(result.deletedAt).toBeDefined();
		});

		it('should remove both channel and partner relations', async () => {
			// Setup: Create a share
			await SELF.addChannelShare(testChannel1, testOrg2);

			// Remove the share
			await SELF.removeChannelShare(testChannel1, testOrg2);

			// Verify channel->partner relation is removed
			const partners = await SELF.listChannelPartners(testChannel1);
			expect(partners).not.toContain(testOrg2);

			// Verify partner->channel relation is removed
			const channels = await SELF.listPartnerChannels(testOrg2);
			expect(channels).not.toContain(testChannel1);
		});
	});

	// ==================================================================================
	// listChannelPartners Tests
	// ==================================================================================

	describe('listChannelPartners', () => {
		it('should list all partners for a channel', async () => {
			// Setup: Share channel1 with org2 and org3
			await SELF.addChannelShare(testChannel1, testOrg2);
			await SELF.addChannelShare(testChannel1, testOrg3);

			const partners = await SELF.listChannelPartners(testChannel1);

			expect(partners).toHaveLength(2);
			expect(partners).toContain(testOrg2);
			expect(partners).toContain(testOrg3);
		});

		it('should filter by specific partner when provided', async () => {
			// Setup: Share with multiple partners
			await SELF.addChannelShare(testChannel1, testOrg2);
			await SELF.addChannelShare(testChannel1, testOrg3);

			// Filter for specific partner
			const partners = await SELF.listChannelPartners(testChannel1, testOrg2);

			expect(partners).toHaveLength(1);
			expect(partners[0]).toBe(testOrg2);
		});

		it('should return empty array for channel with no shares', async () => {
			const partners = await SELF.listChannelPartners(testChannel2);

			expect(partners).toEqual([]);
		});

		it('should return empty array when filtering for non-existent partner', async () => {
			// Setup: Share with org2 only
			await SELF.addChannelShare(testChannel1, testOrg2);

			// Filter for org3 (which has no share)
			const partners = await SELF.listChannelPartners(testChannel1, testOrg3);

			expect(partners).toEqual([]);
		});
	});

	// ==================================================================================
	// listPartnerChannels Tests
	// ==================================================================================

	describe('listPartnerChannels', () => {
		it('should list all channels shared with a partner', async () => {
			// Setup: Share channel1 and channel2 with org2
			await SELF.addChannelShare(testChannel1, testOrg2);
			await SELF.addChannelShare(testChannel2, testOrg2);

			const channels = await SELF.listPartnerChannels(testOrg2);

			expect(channels).toHaveLength(2);
			expect(channels).toContain(testChannel1);
			expect(channels).toContain(testChannel2);
		});

		it('should filter by specific channel when provided', async () => {
			// Setup: Share multiple channels
			await SELF.addChannelShare(testChannel1, testOrg2);
			await SELF.addChannelShare(testChannel2, testOrg2);

			// Filter for specific channel
			const channels = await SELF.listPartnerChannels(testOrg2, testChannel1);

			expect(channels).toHaveLength(1);
			expect(channels[0]).toBe(testChannel1);
		});

		it('should return empty array for partner with no shares', async () => {
			const channels = await SELF.listPartnerChannels(testOrg3);

			expect(channels).toEqual([]);
		});
	});

	// ==================================================================================
	// channelShareExists Tests
	// ==================================================================================

	describe('channelShareExists', () => {
		it('should return true for existing share', async () => {
			// Setup: Create a share
			await SELF.addChannelShare(testChannel1, testOrg2);

			const exists = await SELF.channelShareExists(testChannel1, testOrg2);

			expect(exists).toBe(true);
		});

		it('should return false for non-existent share', async () => {
			const exists = await SELF.channelShareExists(testChannel1, testOrg3);

			expect(exists).toBe(false);
		});

		it('should be consistent with listChannelPartners', async () => {
			// Setup: Create share
			await SELF.addChannelShare(testChannel1, testOrg2);

			// Check via channelShareExists
			const existsViaHelper = await SELF.channelShareExists(testChannel1, testOrg2);

			// Check via listChannelPartners
			const partners = await SELF.listChannelPartners(testChannel1, testOrg2);
			const existsViaList = partners.length > 0;

			expect(existsViaHelper).toBe(existsViaList);
			expect(existsViaHelper).toBe(true);
		});
	});

	// ==================================================================================
	// Backwards Compatibility Tests (CRITICAL)
	// ==================================================================================

	describe('Backwards Compatibility', () => {
		it('should allow read via owning organization (legacy path)', async () => {
			// User1 is in org1, which owns channel1
			const canRead = await SELF.canReadFromDataChannel(testChannel1, testUser1);

			expect(canRead).toBe(true);
		});

		it('should allow read via partner organization (legacy path)', async () => {
			// Setup: Make org2 a partner of org1
			await SELF.addPartnerToOrg(testOrg1, testOrg2);

			// User2 is in org2, which is a partner of org1 (owner of channel1)
			const canRead = await SELF.canReadFromDataChannel(testChannel1, testUser2);

			expect(canRead).toBe(true);
		});

		it('should allow read via channel share (new granular path)', async () => {
			// Setup: Share channel1 with org2 (NOT via blanket partnership)
			await SELF.addChannelShare(testChannel1, testOrg2);

			// Add a member to org2 to test
			const testUser3 = 'user3@example.com';
			await SELF.addUserToOrg(testOrg2, testUser3);

			// User3 should be able to read channel1 via the channel_share
			// Note: This tests the new read_by_share permission path
			const canRead = await SELF.canReadFromDataChannel(testChannel1, testUser3);

			expect(canRead).toBe(true);
		});

		it('should maintain independence between legacy partnership and granular shares', async () => {
			// Setup: org2 is a partner of org1 (blanket access)
			await SELF.addPartnerToOrg(testOrg1, testOrg2);

			// Remove partnership
			await SELF.deletePartnerInOrg(testOrg1, testOrg2);

			// User2 should NOT be able to read anymore (partnership removed)
			const canReadAfterPartnerRemoval = await SELF.canReadFromDataChannel(testChannel1, testUser2);
			expect(canReadAfterPartnerRemoval).toBe(false);

			// Now add a granular share instead
			await SELF.addChannelShare(testChannel1, testOrg2);

			// User2 should be able to read via the granular share
			const canReadViaShare = await SELF.canReadFromDataChannel(testChannel1, testUser2);
			expect(canReadViaShare).toBe(true);
		});

		it('should support read permission as union of all three paths', async () => {
			// Setup three different scenarios with different users
			const userOwner = 'owner@example.com';
			const userPartner = 'partner@example.com';
			const userShare = 'share@example.com';

			const orgOwner = 'org-owner';
			const orgPartner = 'org-partner';
			const orgShare = 'org-share';
			const channel = 'test-channel-union';

			// Path 1: Owning org
			await SELF.addOrgToDataChannel(channel, orgOwner);
			await SELF.addUserToOrg(orgOwner, userOwner);
			expect(await SELF.canReadFromDataChannel(channel, userOwner)).toBe(true);

			// Path 2: Partner org (legacy)
			await SELF.addPartnerToOrg(orgOwner, orgPartner);
			await SELF.addUserToOrg(orgPartner, userPartner);
			expect(await SELF.canReadFromDataChannel(channel, userPartner)).toBe(true);

			// Path 3: Granular share (new)
			await SELF.addChannelShare(channel, orgShare);
			await SELF.addUserToOrg(orgShare, userShare);
			expect(await SELF.canReadFromDataChannel(channel, userShare)).toBe(true);

			// All three paths should work simultaneously
			expect(await SELF.canReadFromDataChannel(channel, userOwner)).toBe(true);
			expect(await SELF.canReadFromDataChannel(channel, userPartner)).toBe(true);
			expect(await SELF.canReadFromDataChannel(channel, userShare)).toBe(true);
		});
	});

	// ==================================================================================
	// Edge Cases
	// ==================================================================================

	describe('Edge Cases', () => {
		it('should handle composite ID format correctly', async () => {
			// The share ID is internally: "channelId:partnerOrgId"
			// This should work correctly even with channels/orgs that have special chars
			const channelWithDash = 'channel-with-dash';
			const orgWithUnderscore = 'org_with_underscore';

			await SELF.addOrgToDataChannel(channelWithDash, testOrg1);
			await SELF.addChannelShare(channelWithDash, orgWithUnderscore);

			const partners = await SELF.listChannelPartners(channelWithDash);
			expect(partners).toContain(orgWithUnderscore);

			const channels = await SELF.listPartnerChannels(orgWithUnderscore);
			expect(channels).toContain(channelWithDash);
		});

		it('should support multiple shares for same channel to different partners', async () => {
			const org1 = 'multi-org-1';
			const org2 = 'multi-org-2';
			const org3 = 'multi-org-3';

			// Share same channel with 3 different orgs
			await SELF.addChannelShare(testChannel1, org1);
			await SELF.addChannelShare(testChannel1, org2);
			await SELF.addChannelShare(testChannel1, org3);

			const partners = await SELF.listChannelPartners(testChannel1);

			expect(partners).toHaveLength(3);
			expect(partners).toContain(org1);
			expect(partners).toContain(org2);
			expect(partners).toContain(org3);

			// Remove one share - others should remain
			await SELF.removeChannelShare(testChannel1, org2);

			const remainingPartners = await SELF.listChannelPartners(testChannel1);
			expect(remainingPartners).toHaveLength(2);
			expect(remainingPartners).toContain(org1);
			expect(remainingPartners).toContain(org3);
			expect(remainingPartners).not.toContain(org2);
		});
	});
});
