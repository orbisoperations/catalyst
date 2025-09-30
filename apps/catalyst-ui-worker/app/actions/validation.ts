'use server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import DataChannelCertifierWorker, { ValidationResult } from '@catalyst/data_channel_certifier';

function getEnv() {
    return getCloudflareContext().env as CloudflareEnv;
}

function getCertifier() {
    // Service binding to data-channel-certifier
    return getEnv().DATA_CHANNEL_CERTIFIER as Service<DataChannelCertifierWorker>;
}

export async function validateChannel(channelId: string, endpoint: string, organization: string) {
    const certifier = getCertifier();

    try {
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
        throw new Error('Failed to validate data channel');
    }
}
