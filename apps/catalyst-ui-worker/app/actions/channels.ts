'use server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { CloudflareEnv, getRegistrar, DataChannelSchema, DataChannel } from '@catalyst/schemas';

function getEnv(): CloudflareEnv {
    return getCloudflareContext().env as CloudflareEnv;
}

export async function createDataChannel(formData: FormData, token: string) {
    const env = getEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: token,
    };

    const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        endpoint: formData.get('endpoint') as string,
        creatorOrganization: formData.get('organization') as string,
        accessSwitch: true,
    };

    const parsed = DataChannelSchema.omit({ id: true }).safeParse(data);

    if (!parsed.success) {
        console.error('Validation failed for data:', data);
        console.error('Full error object:', JSON.stringify(parsed.error, null, 2));

        // Extract name field errors specifically for display
        const nameErrors = parsed.error.issues
            .filter((issue) => issue.path.includes('name'))
            .map((issue) => issue.message);

        // If there are name-specific errors, return validation error result
        if (nameErrors.length > 0) {
            return { success: false, error: nameErrors[0], isValidationError: true };
        }

        // For other validation errors, format them and return as validation error
        const fieldErrors =
            parsed.error.issues?.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ') ||
            'Unknown validation error';
        console.error('Validation errors:', fieldErrors);
        return { success: false, error: `Invalid data channel - ${fieldErrors}`, isValidationError: true };
    }
    const newChannel = await api.create('default', parsed.data, tokenObject);
    if (!newChannel.success) {
        console.error(newChannel.error);
        const errorMessage = newChannel.error || 'Failed to create data channel';
        // Duplicate name errors are client errors (400), return as validation error
        const isValidationError = errorMessage.includes('already exists in your organization');
        return { success: false, error: errorMessage, isValidationError };
    }
    return { success: true, data: newChannel.data as DataChannel };
}

export async function listChannels(token: string) {
    const env = getEnv();
    const api = getRegistrar(env);

    const tokenObject = {
        cfToken: token,
    };

    const channels = await api.list('default', tokenObject);
    if (!channels.success) {
        throw new Error('Failed to list data channels');
    }
    return channels.data as DataChannel[];
}

export async function listPartnersChannels(token: string, partnerId: string) {
    const channelsResponse = await listChannels(token);
    return channelsResponse.filter((channel) => channel.creatorOrganization === partnerId);
}

export async function getChannel(channelId: string, token: string) {
    const env = getEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: token,
    };

    const channelResp = await api.read('default', channelId, tokenObject);
    if (!channelResp.success) {
        throw new Error('Failed to get data channel');
    }
    return channelResp.data as DataChannel;
}

export async function updateChannel(formData: FormData, token: string) {
    const env = getEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: token,
    };
    const dataChannel = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        endpoint: formData.get('endpoint') as string,
        creatorOrganization: formData.get('organization') as string,
        accessSwitch: formData.get('accessSwitch') === 'on' ? true : false,
        id: formData.get('id') as string,
    };

    const parsed = DataChannelSchema.safeParse(dataChannel);
    if (!parsed.success) {
        console.error('Validation failed for data:', dataChannel);
        console.error('Full error object:', JSON.stringify(parsed.error, null, 2));

        // Extract name field errors specifically for display
        const nameErrors = parsed.error.issues
            .filter((issue) => issue.path.includes('name'))
            .map((issue) => issue.message);

        // If there are name-specific errors, return validation error result
        if (nameErrors.length > 0) {
            return { success: false, error: nameErrors[0], isValidationError: true };
        }

        // For other validation errors, format them and return as validation error
        const fieldErrors =
            parsed.error.issues?.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ') ||
            'Unknown validation error';
        console.error('Validation errors:', fieldErrors);
        return { success: false, error: `Invalid data channel - ${fieldErrors}`, isValidationError: true };
    }
    const updateOperation = await api.update('default', parsed.data, tokenObject);
    if (!updateOperation.success) {
        const errorMessage = updateOperation.error || 'Failed to update data channel';
        // Duplicate name errors are client errors (400), return as validation error
        const isValidationError = errorMessage.includes('already exists in your organization');
        return { success: false, error: errorMessage, isValidationError };
    }
    return { success: true, data: updateOperation.data as DataChannel };
}

export async function checkChannelNameAvailability(
    name: string,
    organization: string,
    token: string,
    excludeChannelId?: string
) {
    const env = getEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: token,
    };

    const response = await api.checkNameAvailability('default', name, organization, tokenObject, excludeChannelId);
    return response;
}

export async function handleSwitch(channelId: string, accessSwitch: boolean, token: string) {
    const env = getEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: token,
    };
    const channelResp = await api.read('default', channelId, tokenObject);
    if (!channelResp.success) {
        throw new Error('unable to toggle datachannel');
    }
    const channel = channelResp.data as DataChannel;
    channel.accessSwitch = accessSwitch;
    const updateOperation = await api.update('default', channel, tokenObject);
    if (!updateOperation.success) {
        throw new Error('Failed to update data channel');
    }
    return updateOperation.data as DataChannel;
}

export async function deleteChannel(channelID: string, token: string) {
    const env = getEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: token,
    };
    const deleteOperation = await api.remove('default', channelID, tokenObject);
    if (!deleteOperation.success) {
        throw new Error('Failed to delete data channel');
    }
    return deleteOperation.data as DataChannel;
}
