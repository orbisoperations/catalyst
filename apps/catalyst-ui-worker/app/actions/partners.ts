'use server';
import { getMatchmaking, OrgInvite, OrgInviteSchema } from '@catalyst/schemas';
import { getCloudflareEnv, getCFAuthorizationToken } from '@/app/lib/server-utils';

export async function listInvites(): Promise<OrgInvite[]> {
    const env = getCloudflareEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.listInvites({ cfToken: await getCFAuthorizationToken() });
    if (!result.success) {
        throw new Error(result.error);
    }
    return OrgInviteSchema.array().parse(result.data);
}

export type SendInviteResult = { success: true; data: OrgInvite } | { success: false; error: string };

export async function sendInvite(receivingOrg: string, message: string): Promise<SendInviteResult> {
    const env = getCloudflareEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.sendInvite(receivingOrg, { cfToken: await getCFAuthorizationToken() }, message);
    if (!result.success) {
        // Return error as data instead of throwing - Next.js server actions redact thrown error messages
        return { success: false, error: result.error || 'Sending Invite Failed' };
    }

    return { success: true, data: OrgInviteSchema.parse(result.data) };
}

export async function readInvite(inviteId: string): Promise<OrgInvite> {
    const env = getCloudflareEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.readInvite(inviteId, { cfToken: await getCFAuthorizationToken() });
    if (!result.success) {
        throw new Error('Reading Invite Failed');
    }
    return OrgInviteSchema.parse(result.data);
}

export async function declineInvite(inviteId: string): Promise<OrgInvite> {
    const env = getCloudflareEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.declineInvite(inviteId, { cfToken: await getCFAuthorizationToken() });
    if (!result.success) {
        throw new Error('Declining Invite Failed');
    }
    return OrgInviteSchema.parse(result.data);
}

export async function acceptInvite(inviteId: string): Promise<OrgInvite> {
    const env = getCloudflareEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.acceptInvite(inviteId, { cfToken: await getCFAuthorizationToken() });

    if (!result.success) {
        throw new Error('Accepting Invite Failed');
    }
    return OrgInviteSchema.parse(result.data);
}

export async function togglePartnership(inviteId: string): Promise<OrgInvite> {
    const env = getCloudflareEnv();
    const matcher = getMatchmaking(env);
    const result = await matcher.togglePartnership(inviteId, { cfToken: await getCFAuthorizationToken() });
    if (!result.success) {
        throw new Error('Toggling Partnership Failed');
    }
    return OrgInviteSchema.parse(result.data);
}
