import { z } from 'zod/v4';
import { OrgIdSchema } from '../../core/identifiers';
import { OrgInviteStatusEnum } from '../../constants/statuses';
import { safeMessage, timestamp, createResponseSchema } from '../../core';

// Re-export for backward compatibility
export const OrgInviteStatus = OrgInviteStatusEnum;
export type OrgInviteStatus = z.infer<typeof OrgInviteStatusEnum>;

export const OrgInvite = z.object({
    id: z.string().min(1, 'Invite ID is required').max(100, 'Invite ID too long'),
    status: OrgInviteStatus,
    sender: OrgIdSchema,
    receiver: OrgIdSchema,
    message: safeMessage(),
    isActive: z.boolean(),
    createdAt: timestamp(),
    updatedAt: timestamp(),
});
export type OrgInvite = z.infer<typeof OrgInvite>;

// Response schemas - maintaining backward compatibility with 'invite' property
const inviteAction = z.object({
    success: z.literal(true),
    invite: z.union([OrgInvite, OrgInvite.array()]),
});

const inviteError = z.object({
    success: z.literal(false),
    error: z.string().min(1, 'Error message is required'),
});

export const OrgInviteResponse = z.discriminatedUnion('success', [inviteAction, inviteError]);
export type OrgInviteResponse = z.infer<typeof OrgInviteResponse>;

// Alternative standardized response schema for new code
export const OrgInviteStandardResponse = createResponseSchema(OrgInvite);
export type OrgInviteStandardResponse = z.infer<typeof OrgInviteStandardResponse>;
