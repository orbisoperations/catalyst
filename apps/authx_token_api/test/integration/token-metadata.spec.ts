import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllAuthzedRoles, custodianCreatesDataChannel, generateDataChannels, TEST_ORG_ID, validUsers } from '../utils/testUtils';
import { Token } from '@catalyst/schemas';

describe('Integration: Token Metadata Preservation', () => {
	beforeEach(async () => {
		await clearAllAuthzedRoles();
	});

	describe('signJWT() with custom metadata', () => {
		it('should preserve user-provided name and description', async () => {
			// Setup: Create a data channel and give the user permissions
			const dataChannel = generateDataChannels()[0];
			const channel = await custodianCreatesDataChannel(dataChannel);
			expect(channel).toBeDefined();

			const user = validUsers['cf-custodian-token'];
			const token: Token = { cfToken: 'cf-custodian-token' };

			// Sign JWT with custom metadata
			const customName = 'My Custom API Token';
			const customDescription = 'This is a special token for testing purposes with a longer description';

			const jwtRequest = {
				entity: `${TEST_ORG_ID}/${user.email}`,
				claims: [channel.id],
				name: customName,
				description: customDescription,
			};

			const signResult = await SELF.signJWT(jwtRequest, 3600 * 1000, token);
			expect(signResult.success).toBe(true);

			if (!signResult.success) {
				throw new Error('JWT signing failed');
			}

			// Extract jti from the token to check registry
			const decodedToken = await env.KEY_PROVIDER.get(env.KEY_PROVIDER.idFromName('default')).decodeToken(signResult.token);
			expect(decodedToken.success).toBe(true);
			expect(decodedToken.payload?.jti).toBeDefined();

			// Check that the token was registered with custom metadata
			const registryEntry = await env.ISSUED_JWT_REGISTRY.getById(decodedToken.payload.jti);
			expect(registryEntry).toBeDefined();
			expect(registryEntry.name).toBe(customName);
			expect(registryEntry.description).toBe(customDescription);
			expect(registryEntry.organization).toBe(TEST_ORG_ID);
		});

		it('should use default metadata when name and description are not provided', async () => {
			// Setup: Create a data channel and give the user permissions
			const dataChannel = generateDataChannels()[0];
			const channel = await custodianCreatesDataChannel(dataChannel);
			expect(channel).toBeDefined();

			const user = validUsers['cf-custodian-token'];
			const token: Token = { cfToken: 'cf-custodian-token' };

			// Sign JWT WITHOUT custom metadata
			const jwtRequest = {
				entity: `${TEST_ORG_ID}/${user.email}`,
				claims: [channel.id],
				// No name or description provided
			};

			const signResult = await SELF.signJWT(jwtRequest, 3600 * 1000, token);
			expect(signResult.success).toBe(true);

			if (!signResult.success) {
				throw new Error('JWT signing failed');
			}

			// Extract jti from the token to check registry
			const decodedToken = await env.KEY_PROVIDER.get(env.KEY_PROVIDER.idFromName('default')).decodeToken(signResult.token);
			expect(decodedToken.success).toBe(true);
			expect(decodedToken.payload?.jti).toBeDefined();

			// Check that the token was registered with default metadata
			const registryEntry = await env.ISSUED_JWT_REGISTRY.getById(decodedToken.payload.jti);
			expect(registryEntry).toBeDefined();
			expect(registryEntry.name).toBe(`User token for ${user.email}`);
			expect(registryEntry.description).toBe(`User token with 1 data channel claims`);
			expect(registryEntry.organization).toBe(TEST_ORG_ID);
		});

		it('should handle empty strings for metadata gracefully', async () => {
			// Setup: Create a data channel and give the user permissions
			const dataChannel = generateDataChannels()[0];
			const channel = await custodianCreatesDataChannel(dataChannel);
			expect(channel).toBeDefined();

			const user = validUsers['cf-custodian-token'];
			const token: Token = { cfToken: 'cf-custodian-token' };

			// Sign JWT with empty strings (should use defaults)
			const jwtRequest = {
				entity: `${TEST_ORG_ID}/${user.email}`,
				claims: [channel.id],
				name: '',
				description: '',
			};

			const signResult = await SELF.signJWT(jwtRequest, 3600 * 1000, token);
			expect(signResult.success).toBe(true);

			if (!signResult.success) {
				throw new Error('JWT signing failed');
			}

			// Extract jti from the token to check registry
			const decodedToken = await env.KEY_PROVIDER.get(env.KEY_PROVIDER.idFromName('default')).decodeToken(signResult.token);
			expect(decodedToken.success).toBe(true);
			expect(decodedToken.payload?.jti).toBeDefined();

			// Check that the token was registered with default metadata (empty strings should be ignored)
			const registryEntry = await env.ISSUED_JWT_REGISTRY.getById(decodedToken.payload.jti);
			expect(registryEntry).toBeDefined();
			expect(registryEntry.name).toBe(`User token for ${user.email}`);
			expect(registryEntry.description).toBe(`User token with 1 data channel claims`);
		});

		it('should preserve metadata for tokens with multiple claims', async () => {
			// Setup: Create multiple data channels
			const dataChannels = generateDataChannels(3);
			const channels = await Promise.all(dataChannels.map((dc) => custodianCreatesDataChannel(dc)));

			const user = validUsers['cf-custodian-token'];
			const token: Token = { cfToken: 'cf-custodian-token' };

			// Sign JWT with custom metadata and multiple claims
			const customName = 'Multi-Channel Access Token';
			const customDescription = 'Token granting access to multiple data channels for testing';

			const jwtRequest = {
				entity: `${TEST_ORG_ID}/${user.email}`,
				claims: channels.map((c) => c.id),
				name: customName,
				description: customDescription,
			};

			const signResult = await SELF.signJWT(jwtRequest, 3600 * 1000, token);
			expect(signResult.success).toBe(true);

			if (!signResult.success) {
				throw new Error('JWT signing failed');
			}

			// Extract jti from the token to check registry
			const decodedToken = await env.KEY_PROVIDER.get(env.KEY_PROVIDER.idFromName('default')).decodeToken(signResult.token);
			expect(decodedToken.success).toBe(true);
			expect(decodedToken.payload?.jti).toBeDefined();

			// Check that the token was registered with custom metadata
			const registryEntry = await env.ISSUED_JWT_REGISTRY.getById(decodedToken.payload.jti);
			expect(registryEntry).toBeDefined();
			expect(registryEntry.name).toBe(customName);
			expect(registryEntry.description).toBe(customDescription);
			expect(registryEntry.claims).toHaveLength(3);
			expect(registryEntry.organization).toBe(TEST_ORG_ID);
		});
	});
});
