'use server';
import { type ValidationResult, getAuthzed, getCertifier } from '@catalyst/schemas';
import { getCloudflareEnv, getAuthenticatedUser } from '@/app/lib/server-utils';

export async function canUserValidateChannels(): Promise<boolean> {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return false;
        }

        const authzed = getAuthzed(getCloudflareEnv());
        return await authzed.canCreateUpdateDeleteDataChannel(user.orgId, user.userId);
    } catch (error) {
        console.error('Failed to check user permissions:', error);
        return false;
    }
}

export async function validateChannel(channelId: string, endpoint: string, organization: string) {
    const env = getCloudflareEnv();

    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            throw new Error('Unauthorized: Authentication required');
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
