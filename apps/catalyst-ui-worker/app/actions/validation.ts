'use server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { ValidationResult } from '@catalyst/schemas';
import type { User } from '@catalyst/schemas';
import { cookies } from 'next/headers';

function getEnv() {
    return getCloudflareContext().env as CloudflareEnv;
}

function getCertifier() {
    // Service binding to data-channel-certifier
    return getEnv().DATA_CHANNEL_CERTIFIER as Service<DataChannelCertifierWorker>;
}

export async function canUserValidateChannels(): Promise<boolean> {
    const env = getEnv();

    try {
        // Get the CF_Authorization token from cookies
        const cfToken = (await cookies()).get('CF_Authorization')?.value;
        if (!cfToken) {
            return false;
        }

        // Validate the token and get user details
        const user: User | undefined = (await env.USER_CREDS_CACHE.getUser(cfToken)) as User | undefined;
        if (!user) {
            return false;
        }

        // Check if user has data_channel_update permission (data custodian or admin)
        // This checks create, update, and delete permissions
        const hasPermission = await env.AUTHX_AUTHZED_API.canCreateUpdateDeleteDataChannel(user.orgId, user.userId);

        return hasPermission;
    } catch (error) {
        console.error('Failed to check user permissions:', error);
        return false;
    }
}

export async function validateChannel(channelId: string, endpoint: string, organization: string) {
    const certifier = getCertifier();
    const env = getEnv();

    try {
        // Get the CF_Authorization token from cookies
        const cfToken = (await cookies()).get('CF_Authorization')?.value;
        if (!cfToken) {
            throw new Error('Unauthorized: No authentication token found');
        }

        // Validate the token and get user details
        const user: User | undefined = (await env.USER_CREDS_CACHE.getUser(cfToken)) as User | undefined;
        if (!user) {
            throw new Error('Unauthorized: Invalid authentication token');
        }

        // Check if user has data_channel_update permission (data custodian or admin)
        // This checks create, update, and delete permissions
        const hasPermission = await env.AUTHX_AUTHZED_API.canCreateUpdateDeleteDataChannel(user.orgId, user.userId);

        if (!hasPermission) {
            throw new Error('Unauthorized: You must have data custodian permissions to validate channels');
        }

        // Check if user's organization matches the channel's organization
        if (user.orgId !== organization) {
            throw new Error('Unauthorized: You can only validate data channels belonging to your organization');
        }

        // Call the RPC method directly via service binding
        const result = await certifier.validateChannel({
            channelId,
            endpoint,
            organizationId: organization,
        });

        // Ensure it's a plain object by converting to JSON and back
        // This removes any class instances or non-serializable data
        return JSON.parse(JSON.stringify(result)) as ValidationResult;
    } catch (error) {
        console.error('Failed to validate channel:', error);
        if (error instanceof Error && error.message.startsWith('Unauthorized:')) {
            throw error;
        }
        throw new Error('Failed to validate data channel');
    }
}
