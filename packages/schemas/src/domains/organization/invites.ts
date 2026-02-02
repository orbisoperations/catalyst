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

// Strict schema for validating new input (create/update operations)
export const OrgInviteInputSchema = z.object({
    id: z.string().min(1, 'Invite ID is required').max(100, 'Invite ID too long'),
    status: OrgInviteStatusSchema,
    sender: OrgIdSchema,
    receiver: OrgIdSchema,
    message: safeMessage(),
    isActive: z.boolean(),
    disabledBy: OrgIdSchema.nullable().default(null),
    createdAt: timestamp(),
    updatedAt: timestamp(),
});

// Lenient schema for parsing stored data (allows timestamps beyond 10 years for old data)
export const OrgInviteStoredSchema = z.object({
    id: z.string().min(1, 'Invite ID is required').max(100, 'Invite ID too long'),
    status: OrgInviteStatusSchema,
    sender: OrgIdSchema,
    receiver: OrgIdSchema,
    message: z.string().max(1000), // Lenient message validation
    isActive: z.boolean(),
    disabledBy: z.string().min(1).max(100).nullable().optional().default(null),
    createdAt: z.number().int().positive(),
    updatedAt: z.number().int().positive(),
});

// Backwards compatibility: OrgInviteSchema points to the input schema
export const OrgInviteSchema = OrgInviteInputSchema;

export type OrgInvite = z.infer<typeof OrgInviteInputSchema>;

// Response schema for API boundaries (single invite or array)
export const OrgInviteResponseSchema = createResponseSchema(z.union([OrgInviteSchema, OrgInviteSchema.array()]));
export const OrgInviteStoredResponseSchema = createResponseSchema(
    z.union([OrgInviteStoredSchema, OrgInviteStoredSchema.array()])
);
export type OrgInviteResponse = z.infer<typeof OrgInviteResponseSchema>;
