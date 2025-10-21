import { env } from 'cloudflare:test';
import { expect } from 'vitest';
import { DataChannel } from '@catalyst/schemas';
import { JWTAudience } from '@catalyst/schemas';
import { TEST_ORG_ID, validUsers } from './authUtils';

export { TEST_ORG_ID, validUsers };

/**
 * Generates a specified number of test data channels with dummy data
 *
 * @param count - Number of data channels to generate (default: 5)
 * @returns Array of DataChannel objects with test data
 */
export function generateDataChannels(count: number = 5): DataChannel[] {
	const dataChannels: DataChannel[] = [];
	for (let i = 0; i < count; i++) {
		const dataChannel = {
			id: `dummy-id-${i}`,
			name: `Data Channel ${i}`,
			endpoint: `https://example.com/data${i}`,
			creatorOrganization: TEST_ORG_ID,
			accessSwitch: true,
			description: `This is a test data channel ${i}`,
		};
		dataChannels.push(dataChannel);
	}
	return dataChannels;
}

/**
 * Helper function that creates a data channel using a data custodian's permissions
 * and sets up all necessary relations in authzed
 *
 * @param dataChannel - The data channel to create
 * @returns The created data channel from the API response
 * @throws Error if channel creation fails
 */
export async function custodianCreatesDataChannel(dataChannel: DataChannel) {
	expect(dataChannel).toBeDefined();

	const user = validUsers['cf-custodian-token'];
	expect(user).toBeDefined();

	// add the data custodian to the org
	const addDataCustodianToOrg = await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, user.email);
	expect(addDataCustodianToOrg).toBeDefined();

	const createResponse = await env.DATA_CHANNEL_REGISTRAR.create('default', dataChannel, {
		cfToken: 'cf-custodian-token',
	});
	expect(createResponse).toBeDefined();
	expect(createResponse.success).toBe(true);

	// add the data channel to the org
	const addDataChannelToOrg = await env.AUTHZED.addDataChannelToOrg(TEST_ORG_ID, dataChannel.id);
	// add the org to the data channel
	const addOrgToDataChannel = await env.AUTHZED.addOrgToDataChannel(dataChannel.id, TEST_ORG_ID);

	expect(addDataChannelToOrg).toBeDefined();
	expect(addOrgToDataChannel).toBeDefined();

	expect(createResponse.success).toBe(true);

	if (!createResponse.success) {
		throw new Error('Failed to create data channel');
	}

	return Array.isArray(createResponse.data) ? createResponse.data[0] : createResponse.data;
}

/**
 * Retrieves the organization ID from a given Cloudflare token
 *
 * @param cfToken - The Cloudflare token to extract the organization ID from
 * @returns The organization ID as a string
 */
export function getOrgId(cfToken: string) {
	const user = validUsers[cfToken];
	if (!user) {
		throw new Error('User not found');
	}
	const custom = user.custom['urn:zitadel:iam:org:project:roles'];
	const roles = Object.values(custom);
	const orgId = Object.values(roles);
	return Object.values(orgId[0])[0];
}

export async function getCatalystToken(cfToken: string, claims: string[]) {
	const user = validUsers[cfToken];
	// always use the default as DO Namespace
	const id = env.KEY_PROVIDER.idFromName('default');
	const stub = env.KEY_PROVIDER.get(id);
	const token = stub.signJWT(
		{
			entity: `${getOrgId(cfToken)}/${user.email}`,
			claims,
			audience: JWTAudience.enum['catalyst:datachannel'],
			expiresIn: Date.now() + 3600,
		},
		Date.now() + 3600,
	);
	return token;
}

export async function clearAllAuthzedRoles() {
	for (const cfToken in validUsers) {
		const user = validUsers[cfToken];
		if (!user) {
			throw new Error('User not found');
		}
		const userId = user.email;
		const addDataCustodianToOrg = await env.AUTHZED.deleteAdminFromOrg(TEST_ORG_ID, userId);
		expect(addDataCustodianToOrg).toBeDefined();
		const addDataChannelToOrg = await env.AUTHZED.deleteDataCustodianFromOrg(TEST_ORG_ID, userId);
		expect(addDataChannelToOrg).toBeDefined();
		const addOrgToDataChannel = await env.AUTHZED.deleteUserFromOrg(TEST_ORG_ID, userId);
		expect(addOrgToDataChannel).toBeDefined();
	}
}
