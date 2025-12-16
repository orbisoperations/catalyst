'use server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { CloudflareEnv, getRegistrar, DataChannelInputSchema, DataChannel } from '@catalyst/schemas';
import { z } from 'zod/v4';

// Input validation schemas for sharing operations
const ChannelIdSchema = z.string().uuid('Invalid channel ID format');
const OrgIdSchema = z.string().min(1, 'Organization ID is required').max(100, 'Organization ID too long');

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

// ============================================
// Channel Sharing Actions
// ============================================

/**
 * Partner info returned from channel sharing APIs.
 */
export interface ChannelPartner {
    id: string;
    name: string;
    description: string;
    sharing: boolean;
}

/**
 * Get all partners that a channel is shared with.
 * Only accessible by channel owner.
 */
export async function getChannelPartners(channelId: string, token: string): Promise<ChannelPartner[]> {
    // Validate inputs
    const channelParse = ChannelIdSchema.safeParse(channelId);
    if (!channelParse.success) {
        console.error('Invalid channel ID:', channelParse.error.message);
        return [];
    }

    const env = getEnv();
    const api = getRegistrar(env);
    const tokenObject = { cfToken: token };

    const response = await api.listChannelPartners('default', channelId, tokenObject);
    if (!response.success) {
        console.error('Failed to list channel partners:', response.error);
        return [];
    }

    // The API returns { id: string, sharing: boolean }[]
    // We need to enrich with partner name/description from matchmaking
    const partners = response.data as Array<{ id: string; sharing: boolean }>;

    // For now, return with placeholder names - in production, enrich from matchmaking
    return partners.map((p) => ({
        id: p.id,
        name: p.id, // Will be enriched by useChannelSharing hook
        description: '',
        sharing: p.sharing,
    }));
}

/**
 * Share a channel with a partner organization.
 * Only accessible by channel owner.
 */
export async function shareChannelWithPartner(
    channelId: string,
    partnerOrgId: string,
    token: string
): Promise<{ success: boolean; error?: string }> {
    // Validate inputs
    const channelParse = ChannelIdSchema.safeParse(channelId);
    if (!channelParse.success) {
        return { success: false, error: 'Invalid channel ID format' };
    }
    const orgParse = OrgIdSchema.safeParse(partnerOrgId);
    if (!orgParse.success) {
        return { success: false, error: 'Invalid partner organization ID' };
    }

    const env = getEnv();
    const api = getRegistrar(env);
    const tokenObject = { cfToken: token };

    const response = await api.shareChannel('default', channelId, partnerOrgId, tokenObject);
    if (!response.success) {
        return {
            success: false,
            error: response.error || 'Failed to share channel',
        };
    }

    return { success: true };
}

/**
 * Remove a partner from channel sharing.
 * Only accessible by channel owner.
 */
export async function removeChannelPartner(
    channelId: string,
    partnerOrgId: string,
    token: string
): Promise<{ success: boolean; error?: string }> {
    // Validate inputs
    const channelParse = ChannelIdSchema.safeParse(channelId);
    if (!channelParse.success) {
        return { success: false, error: 'Invalid channel ID format' };
    }
    const orgParse = OrgIdSchema.safeParse(partnerOrgId);
    if (!orgParse.success) {
        return { success: false, error: 'Invalid partner organization ID' };
    }

    const env = getEnv();
    const api = getRegistrar(env);
    const tokenObject = { cfToken: token };

    const response = await api.unshareChannel('default', channelId, partnerOrgId, tokenObject);
    if (!response.success) {
        return {
            success: false,
            error: response.error || 'Failed to remove channel partner',
        };
    }

    return { success: true };
}
