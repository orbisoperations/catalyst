'use server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { CloudflareEnv, getMatchmaking, OrgInvite, OrgInviteSchema } from '@catalyst/schemas';

function getEnv(): CloudflareEnv {
    return getCloudflareContext().env as CloudflareEnv;
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
