import { z } from 'zod';

export const DataChannel = z.object({
    id: z.string(),
    accessSwitch: z.boolean(),
    name: z.string(),
    endpoint: z.string(),
    description: z.string(),
    creatorOrganization: z.string(),
});

export type DataChannel = z.infer<typeof DataChannel>;

export const OrgId = z.string();
export type OrgId = z.infer<typeof OrgId>;

export const UserId = z.string();
export type UserId = z.infer<typeof UserId>;

export const DataChannelId = z.string();
export type DataChannelId = z.infer<typeof DataChannelId>;

export const User = z.object({
    userId: UserId,
    orgId: OrgId,
    zitadelRoles: z.enum(['platform-admin', 'org-admin', 'org-user', 'data-custodian']).array(),
});

export type User = z.infer<typeof User>;

const dataChannelActionSuccess = z.object({
    success: z.literal(true),
    data: z.union([DataChannel, DataChannel.array()]),
});

const dataChannelActionError = z.object({
    success: z.literal(false),
    error: z.string(),
});
export const DataChannelActionResponse = z.discriminatedUnion('success', [
    dataChannelActionError,
    dataChannelActionSuccess,
]);

export type DataChannelActionResponse = z.infer<typeof DataChannelActionResponse>;

export const OrgInviteStatus = z.enum(['pending', 'accepted', 'declined']);
export type OrgInviteStatus = z.infer<typeof OrgInviteStatus>;
export const OrgInvite = z.object({
    id: z.string(),
    status: OrgInviteStatus,
    sender: OrgId,
    receiver: OrgId,
    message: z.string(),
    isActive: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type OrgInvite = z.infer<typeof OrgInvite>;

const inviteAction = z.object({
    success: z.literal(true),
    invite: z.union([OrgInvite, OrgInvite.array()]),
});

const inviteError = z.object({
    success: z.literal(false),
    error: z.string(),
});

export const OrgInviteResponse = z.discriminatedUnion('success', [inviteAction, inviteError]);

export type OrgInviteResponse = z.infer<typeof OrgInviteResponse>;

const zUserCheckActionSuccess = z.object({
    success: z.literal(true),
    data: User,
});

const zUserCheckActionError = z.object({
    success: z.literal(false),
    error: z.string(),
});
export const UserCheckActionResponse = z.discriminatedUnion('success', [
    zUserCheckActionError,
    zUserCheckActionSuccess,
]);

export type UserCheckActionResponse = z.infer<typeof UserCheckActionResponse>;
