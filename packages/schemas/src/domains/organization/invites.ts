import { z } from 'zod/v4';
import { OrgIdSchema } from '../../core/identifiers';
import { OrgInviteStatusEnum } from '../../constants/statuses';
import { safeMessage, timestamp, createResponseSchema } from '../../core';

/**
 * Organization Invite Schemas
 *
 * Schemas follow the naming convention:
 * - Runtime validators: `*Schema` suffix
 * - Inferred types: No suffix
 */

// Status schema and type
export const OrgInviteStatusSchema = OrgInviteStatusEnum;
export type OrgInviteStatus = z.infer<typeof OrgInviteStatusSchema>;

// Entity schema and type
export const OrgInviteSchema = z.object({
    id: z.string().min(1, 'Invite ID is required').max(100, 'Invite ID too long'),
    status: OrgInviteStatusSchema,
    sender: OrgIdSchema,
    receiver: OrgIdSchema,
    message: safeMessage(),
    isActive: z.boolean(),
    createdAt: timestamp(),
    updatedAt: timestamp(),
});
export type OrgInvite = z.infer<typeof OrgInviteSchema>;

// Response schema for API boundaries (single invite or array)
export const OrgInviteResponseSchema = createResponseSchema(z.union([OrgInviteSchema, OrgInviteSchema.array()]));
export type OrgInviteResponse = z.infer<typeof OrgInviteResponseSchema>;
