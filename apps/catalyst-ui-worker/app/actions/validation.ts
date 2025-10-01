'use server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { ValidationResult, User, CloudflareEnv } from '@catalyst/schemas';
import { getAuthzed, getCertifier, getUserCache } from '@catalyst/schemas';
import { cookies } from 'next/headers';

function getEnv(): CloudflareEnv {
    return getCloudflareContext().env as CloudflareEnv;
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
        const userCache = getUserCache(env);
        const user: User | undefined = (await userCache.getUser(cfToken)) as User | undefined;
        if (!user) {
            return false;
        }

        // Check if user has data_channel_update permission (data custodian or admin)
        // This checks create, update, and delete permissions
        const authzed = getAuthzed(env);
        const hasPermission = await authzed.canCreateUpdateDeleteDataChannel(user.orgId, user.userId);

        return hasPermission;
    } catch (error) {
        console.error('Failed to check user permissions:', error);
        return false;
    }
}

export async function validateChannel(channelId: string, endpoint: string, organization: string) {
    const env = getEnv();

    try {
        // Get the CF_Authorization token from cookies
        const cfToken = (await cookies()).get('CF_Authorization')?.value;
        if (!cfToken) {
            throw new Error('Unauthorized: No authentication token found');
        }

        // Validate the token and get user details
        const userCache = getUserCache(env);
        const user: User | undefined = (await userCache.getUser(cfToken)) as User | undefined;
        if (!user) {
            throw new Error('Unauthorized: Invalid authentication token');
        }

        // Check if user has data_channel_update permission (data custodian or admin)
        // This checks create, update, and delete permissions
        const authzed = getAuthzed(env);
        const hasPermission = await authzed.canCreateUpdateDeleteDataChannel(user.orgId, user.userId);

        if (!hasPermission) {
            throw new Error('Unauthorized: You must have data custodian permissions to validate channels');
        }

        // Check if user's organization matches the channel's organization
        if (user.orgId !== organization) {
            throw new Error('Unauthorized: You can only validate data channels belonging to your organization');
        }

        // Call the RPC method directly via service binding
        const certifier = getCertifier(env);
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
