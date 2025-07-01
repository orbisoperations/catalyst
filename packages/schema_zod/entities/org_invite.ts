import { z } from 'zod';
import { defineResult } from '../helpers/result';

export const OrgInviteStatus = z.enum(['pending', 'accepted', 'declined']);
export type OrgInviteStatus = z.infer<typeof OrgInviteStatus>;

export const OrgInvite = z.object({
    id: z.string(),
    status: OrgInviteStatus,
    sender: z.string(),
    receiver: z.string(),
    message: z.string(),
    isActive: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type OrgInvite = z.infer<typeof OrgInvite>;

export const OrgInviteResult = defineResult(z.union([OrgInvite, OrgInvite.array()]));
export type OrgInviteResult = z.infer<typeof OrgInviteResult>;
