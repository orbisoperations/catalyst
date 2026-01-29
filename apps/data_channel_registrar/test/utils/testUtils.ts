import { env, SELF } from 'cloudflare:test';
import { expect } from 'vitest';
import { DataChannel, JWTAudience } from '@catalyst/schemas';
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

  const createResponse = await SELF.create('default', dataChannel, {
    cfToken: 'cf-custodian-token',
  });
  expect(createResponse).toBeDefined();
  expect(createResponse.success).toBe(true);

  if (!createResponse.success) {
    throw new Error(`Failed to create data channel: ${createResponse.error}`);
  }

  // Get the created channel's ID (not the input channel's dummy ID)
  const createdChannel = Array.isArray(createResponse.data)
    ? createResponse.data[0]
    : createResponse.data;
  const createdChannelId = createdChannel.id;

  // add the data channel to the org using the actual created channel ID
  const addDataChannelToOrg = await env.AUTHZED.addDataChannelToOrg(TEST_ORG_ID, createdChannelId);
  // add the org to the data channel
  const addOrgToDataChannel = await env.AUTHZED.addOrgToDataChannel(createdChannelId, TEST_ORG_ID);
  // also add user to the org (in case they weren't already)
  const addUserToOrg = await env.AUTHZED.addUserToOrg(TEST_ORG_ID, user.email);

  expect(addDataChannelToOrg).toBeDefined();
  expect(addOrgToDataChannel).toBeDefined();
  expect(addUserToOrg).toBeDefined();

  return createdChannel;
}

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

  // Use the authx_token_api service to sign JWTs
  // This ensures tokens are properly registered
  const response = await env.AUTHX_TOKEN_API.signJWT(
    {
      entity: user.email,
      claims,
      audience: JWTAudience.enum['catalyst:gateway'],
      expiresIn: 3600, // Used by JWT.payloadRaw() to set internal expiration
    },
    3600 * 1000, // 1 hour in milliseconds - actual token lifetime for signJWT
    { cfToken },
    'default',
  );

  if (!response.success) {
    throw new Error(`Failed to create catalyst token: ${response.error}`);
  }

  return {
    token: response.token,
    expiration: response.expiration,
  };
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
