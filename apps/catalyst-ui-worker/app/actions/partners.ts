'use server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
    CloudflareEnv,
    getMatchmaking,
    getAuthzed,
    getUserCache,
    User,
    OrgInvite,
    OrgInviteSchema,
} from '@catalyst/schemas';
import { cookies } from 'next/headers';

function getEnv(): CloudflareEnv {
    return getCloudflareContext().env as CloudflareEnv;
}

export async function canUserUpdatePartners(): Promise<boolean> {
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

        // Check if user has partner_update permission (admin only)
        const authzed = getAuthzed(env);
        const hasPermission = await authzed.canUpdateOrgPartnersInOrg(user.orgId, user.userId);

        return hasPermission;
    } catch (error) {
        console.error('Failed to check user permissions:', error);
        return false;
    }
}

export async function listInvites(token: string): Promise<OrgInvite[]> {
    const env = getEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.listInvites({ cfToken: token });
    if (!result.success) {
        throw new Error(result.error);
    }
    return OrgInviteSchema.array().parse(result.data);
}

export async function sendInvite(receivingOrg: string, token: string, message: string): Promise<OrgInvite> {
    const env = getEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.sendInvite(receivingOrg, { cfToken: token }, message);
    if (!result.success) {
        throw new Error('Sending Invite Failed');
    }

    return OrgInviteSchema.parse(result.data);
}

export async function readInvite(inviteId: string, token: string): Promise<OrgInvite> {
    const env = getEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.readInvite(inviteId, { cfToken: token });
    if (!result.success) {
        throw new Error('Reading Invite Failed');
    }
    return OrgInviteSchema.parse(result.data);
}

export async function declineInvite(inviteId: string, token: string): Promise<OrgInvite> {
    const env = getEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.declineInvite(inviteId, { cfToken: token });
    if (!result.success) {
        throw new Error('Declining Invite Failed');
    }
    return OrgInviteSchema.parse(result.data);
}

export async function acceptInvite(inviteId: string, token: string): Promise<OrgInvite> {
    const env = getEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.acceptInvite(inviteId, { cfToken: token });

    if (!result.success) {
        throw new Error('Accepting Invite Failed');
    }
    return OrgInviteSchema.parse(result.data);
}

export async function togglePartnership(inviteId: string, token: string): Promise<OrgInvite> {
    const env = getEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.togglePartnership(inviteId, { cfToken: token });
    if (!result.success) {
        throw new Error('Toggling Partnership Failed');
    }
    return OrgInviteSchema.parse(result.data);
}
