/**
 * AuthZed integration test helpers
 *
 * These helpers are for use in INTEGRATION TESTS ONLY.
 * They require real service bindings from `cloudflare:test`.
 *
 * For unit tests, use mocks instead of these helpers.
 */

import type { DataChannel } from '@catalyst/schemas';
import { TEST_ORG_ID, validUsers } from './users.js';

/**
 * Minimal interface for AuthZed service
 * Avoids importing worker internals
 */
export interface AuthzedServiceMinimal {
    deleteAdminFromOrg(org: string, email: string): Promise<unknown>;
    deleteDataCustodianFromOrg(org: string, email: string): Promise<unknown>;
    deleteUserFromOrg(org: string, email: string): Promise<unknown>;
    addDataCustodianToOrg(org: string, email: string): Promise<unknown>;
    addDataChannelToOrg(org: string, channelId: string): Promise<unknown>;
    addOrgToDataChannel(channelId: string, org: string): Promise<unknown>;
    addUserToOrg(org: string, email: string): Promise<unknown>;
}

/**
 * Minimal interface for Data Channel Registrar service
 */
export interface RegistrarServiceMinimal {
    list(
        namespace: string,
        options: { cfToken: string }
    ): Promise<{
        success: boolean;
        data?: DataChannel | DataChannel[];
        error?: string;
    }>;
    create(
        namespace: string,
        channel: DataChannel,
        options: { cfToken: string }
    ): Promise<{
        success: boolean;
        data?: DataChannel | DataChannel[];
        error?: string;
    }>;
    remove(namespace: string, channelId: string, options: { cfToken: string }): Promise<unknown>;
}

/**
 * Environment with required service bindings for AuthZed helpers
 */
export interface AuthzedTestEnv {
    AUTHZED: AuthzedServiceMinimal;
}

/**
 * Environment with required service bindings for registrar helpers
 */
export interface RegistrarTestEnv {
    DATA_CHANNEL_REGISTRAR: RegistrarServiceMinimal;
}

/**
 * Combined environment for full integration test helpers
 */
export interface FullTestEnv extends AuthzedTestEnv, RegistrarTestEnv {}

/**
 * Clear all AuthZed roles for test users
 *
 * Use in beforeEach to ensure clean state between tests.
 * Removes admin, data-custodian, and user roles for all validUsers.
 *
 * @param env - Test environment with AUTHZED service binding
 *
 * @example
 * ```ts
 * import { env } from 'cloudflare:test';
 * import { clearAllAuthzedRoles } from '@catalyst/test-utils';
 *
 * beforeEach(async () => {
 *   await clearAllAuthzedRoles(env);
 * });
 * ```
 */
export async function clearAllAuthzedRoles(env: AuthzedTestEnv): Promise<void> {
    for (const cfToken in validUsers) {
        const user = validUsers[cfToken];
        if (!user) continue;

        const userId = user.email;
        // Silently ignore errors - relations may not exist
        await env.AUTHZED.deleteAdminFromOrg(TEST_ORG_ID, userId).catch(() => {});
        await env.AUTHZED.deleteDataCustodianFromOrg(TEST_ORG_ID, userId).catch(() => {});
        await env.AUTHZED.deleteUserFromOrg(TEST_ORG_ID, userId).catch(() => {});
    }
}

/**
 * Clean up data channels from registrar
 *
 * Removes all data channels in the 'default' namespace.
 * Use in beforeEach to ensure clean state between tests.
 *
 * @param env - Test environment with DATA_CHANNEL_REGISTRAR service binding
 * @param cfToken - CF token for authorization (defaults to custodian)
 *
 * @example
 * ```ts
 * import { env } from 'cloudflare:test';
 * import { cleanupDataChannels } from '@catalyst/test-utils';
 *
 * beforeEach(async () => {
 *   await cleanupDataChannels(env);
 * });
 * ```
 */
export async function cleanupDataChannels(env: RegistrarTestEnv, cfToken = 'cf-custodian-token'): Promise<void> {
    const listResponse = await env.DATA_CHANNEL_REGISTRAR.list('default', { cfToken });

    if (listResponse.success && listResponse.data) {
        const channels = Array.isArray(listResponse.data) ? listResponse.data : [listResponse.data];
        const removals = channels.map((channel: DataChannel) =>
            env.DATA_CHANNEL_REGISTRAR.remove('default', channel.id, { cfToken }).catch(() => {})
        );
        await Promise.allSettled(removals);
    }
}

/**
 * Create a data channel as a data custodian with full AuthZed setup
 *
 * This helper:
 * 1. Adds the custodian role to the test user
 * 2. Creates the data channel via the registrar
 * 3. Sets up all AuthZed relations (channel <-> org)
 * 4. Adds user to org
 *
 * @param env - Test environment with AUTHZED and DATA_CHANNEL_REGISTRAR bindings
 * @param dataChannel - The data channel to create
 * @param cfToken - CF token for authorization (defaults to custodian)
 * @returns The created data channel with server-assigned ID
 *
 * @example
 * ```ts
 * import { env } from 'cloudflare:test';
 * import { custodianCreatesDataChannel, generateDataChannel } from '@catalyst/test-utils';
 *
 * it('should access channel', async () => {
 *   const channel = generateDataChannel({ name: 'Test' });
 *   const created = await custodianCreatesDataChannel(env, channel);
 *   expect(created.id).toBeDefined();
 * });
 * ```
 */
export async function custodianCreatesDataChannel(
    env: FullTestEnv,
    dataChannel: DataChannel,
    cfToken = 'cf-custodian-token'
): Promise<DataChannel> {
    const user = validUsers[cfToken];
    if (!user) {
        throw new Error(`User not found for token: ${cfToken}`);
    }

    // Add the data custodian to the org
    await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, user.email);

    // Create the channel
    const createResponse = await env.DATA_CHANNEL_REGISTRAR.create('default', dataChannel, {
        cfToken,
    });

    if (!createResponse.success) {
        throw new Error(`Failed to create data channel: ${createResponse.error}`);
    }

    // Get the created channel (may have server-assigned ID)
    const createdChannel = Array.isArray(createResponse.data) ? createResponse.data[0] : createResponse.data;

    if (!createdChannel) {
        throw new Error('No channel returned from create');
    }

    const createdChannelId = createdChannel.id;

    // Set up AuthZed relations
    await env.AUTHZED.addDataChannelToOrg(TEST_ORG_ID, createdChannelId);
    await env.AUTHZED.addOrgToDataChannel(createdChannelId, TEST_ORG_ID);
    await env.AUTHZED.addUserToOrg(TEST_ORG_ID, user.email);

    return createdChannel;
}
