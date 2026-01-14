'use server';
import { getRegistrar, DataChannelInputSchema, DataChannel } from '@catalyst/schemas';
import { getCloudflareEnv, getCFAuthorizationToken } from '@/app/lib/server-utils';

export async function createDataChannel(formData: FormData) {
    const env = getCloudflareEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: await getCFAuthorizationToken(),
    };

    const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        endpoint: formData.get('endpoint') as string,
        creatorOrganization: formData.get('organization') as string,
        accessSwitch: true,
    };

    const parsed = DataChannelInputSchema.omit({ id: true }).safeParse(data);

    if (!parsed.success) {
        console.error('Validation failed for data:', data);
        console.error('Full error object:', JSON.stringify(parsed.error, null, 2));

        // Use Zod's error formatting to extract name field errors specifically
        const nameErrors = parsed.error.issues
            .filter((issue) => issue.path.includes('name'))
            .map((issue) => issue.message);

        // If there are name-specific errors, return validation error result
        if (nameErrors.length > 0) {
            return {
                success: false as const,
                error: nameErrors[0],
            };
        }

        // Format other validation errors using Zod's issue structure
        const fieldErrors =
            parsed.error.issues?.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ') ||
            'Unknown validation error';
        console.error('Validation errors:', fieldErrors);
        return {
            success: false as const,
            error: `Invalid data channel - ${fieldErrors}`,
        };
    }
    const newChannel = await api.create('default', parsed.data, tokenObject);
    if (!newChannel.success) {
        console.error(newChannel.error);
        // Ensure we return a plain object (not Zod-parsed)
        return {
            success: false as const,
            error: newChannel.error || 'Failed to create data channel',
        };
    }
    // Ensure single DataChannel (not array) for create response
    const channel = Array.isArray(newChannel.data) ? newChannel.data[0] : newChannel.data;
    return {
        success: true as const,
        data: channel as DataChannel,
    };
}

export async function listChannels() {
    const env = getCloudflareEnv();
    const api = getRegistrar(env);

    const tokenObject = {
        cfToken: await getCFAuthorizationToken(),
    };

    const channels = await api.list('default', tokenObject);
    if (!channels.success) {
        throw new Error('Failed to list data channels');
    }
    return channels.data as DataChannel[];
}

export async function listPartnersChannels(partnerId: string) {
    const channelsResponse = await listChannels();
    return channelsResponse.filter((channel) => channel.creatorOrganization === partnerId);
}

export async function getChannel(channelId: string) {
    const env = getCloudflareEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: await getCFAuthorizationToken(),
    };

    const channelResp = await api.read('default', channelId, tokenObject);
    if (!channelResp.success) {
        throw new Error('Failed to get data channel');
    }
    return channelResp.data as DataChannel;
}

export async function updateChannel(formData: FormData) {
    const env = getCloudflareEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: await getCFAuthorizationToken(),
    };
    const dataChannel = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        endpoint: formData.get('endpoint') as string,
        creatorOrganization: formData.get('organization') as string,
        accessSwitch: formData.get('accessSwitch') === 'on' ? true : false,
        id: formData.get('id') as string,
    };

    const parsed = DataChannelInputSchema.safeParse(dataChannel);
    if (!parsed.success) {
        console.error('Validation failed for data:', dataChannel);
        console.error('Full error object:', JSON.stringify(parsed.error, null, 2));

        // Use Zod's error formatting to extract name field errors specifically
        const nameErrors = parsed.error.issues
            .filter((issue) => issue.path.includes('name'))
            .map((issue) => issue.message);

        // If there are name-specific errors, return validation error result
        if (nameErrors.length > 0) {
            return {
                success: false as const,
                error: nameErrors[0],
            };
        }

        // Format other validation errors using Zod's issue structure
        const fieldErrors =
            parsed.error.issues?.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ') ||
            'Unknown validation error';
        console.error('Validation errors:', fieldErrors);
        return {
            success: false as const,
            error: `Invalid data channel - ${fieldErrors}`,
        };
    }
    const updateOperation = await api.update('default', parsed.data, tokenObject);
    if (!updateOperation.success) {
        // Ensure we return a plain object (not Zod-parsed)
        return {
            success: false as const,
            error: updateOperation.error || 'Failed to update data channel',
        };
    }
    // Ensure single DataChannel (not array) for update response
    const channel = Array.isArray(updateOperation.data) ? updateOperation.data[0] : updateOperation.data;
    return {
        success: true as const,
        data: channel as DataChannel,
    };
}

export async function checkChannelNameAvailability(name: string, organization: string, excludeChannelId?: string) {
    const env = getCloudflareEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: await getCFAuthorizationToken(),
    };

    const response = await api.checkNameAvailability('default', name, organization, tokenObject, excludeChannelId);
    return response;
}

export async function handleSwitch(channelId: string, accessSwitch: boolean) {
    const env = getCloudflareEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: await getCFAuthorizationToken(),
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

export async function deleteChannel(channelID: string) {
    const env = getCloudflareEnv();
    const api = getRegistrar(env);
    const tokenObject = {
        cfToken: await getCFAuthorizationToken(),
    };
    const deleteOperation = await api.remove('default', channelID, tokenObject);
    if (!deleteOperation.success) {
        throw new Error('Failed to delete data channel');
    }
    return deleteOperation.data as DataChannel;
}
