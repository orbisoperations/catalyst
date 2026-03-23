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
    senderEnabled: z.boolean(),
    receiverEnabled: z.boolean(),
    createdAt: timestamp(),
    updatedAt: timestamp(),
});

// Lenient schema for parsing stored data (allows timestamps beyond 10 years for old data)
// Accepts both old (isActive/disabledBy) and new (senderEnabled/receiverEnabled) fields,
// normalizing old data via transform.
export const OrgInviteStoredSchema = z
    .object({
        id: z.string().min(1, 'Invite ID is required').max(100, 'Invite ID too long'),
        status: OrgInviteStatusSchema,
        sender: OrgIdSchema,
        receiver: OrgIdSchema,
        message: z.string().max(1000), // Lenient message validation
        // New fields
        senderEnabled: z.boolean().optional(),
        receiverEnabled: z.boolean().optional(),
        // Old fields (for backward compat)
        isActive: z.boolean().optional(),
        disabledBy: z.string().min(1).max(100).nullable().optional(),
        createdAt: z.number().int().positive(),
        updatedAt: z.number().int().positive(),
    })
    // Migration semantics:
    // - `disabledBy` is intentionally discarded — the new per-org model has no "who disabled" concept.
    // - `isActive: true`  → both senderEnabled and receiverEnabled set to true.
    // - `isActive: false` → both senderEnabled and receiverEnabled set to false.
    // - Behavioral impact: orgs previously blocked by tug-of-war can now independently toggle
    //   their sharing flag. Old data is normalized on read; no backfill write is performed.
    .transform((data) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isActive, disabledBy, ...rest } = data;
        // Both new fields present — use as-is
        if (rest.senderEnabled !== undefined && rest.receiverEnabled !== undefined) {
            return { ...rest, senderEnabled: rest.senderEnabled, receiverEnabled: rest.receiverEnabled };
        }
        // Partial migration: one new field present, other missing
        if (rest.senderEnabled !== undefined || rest.receiverEnabled !== undefined) {
            return {
                ...rest,
                senderEnabled: rest.senderEnabled ?? false,
                receiverEnabled: rest.receiverEnabled ?? false,
            };
        }
        // Full old-data migration
        const enabled = isActive ?? false;
        return { ...rest, senderEnabled: enabled, receiverEnabled: enabled };
    });

// Backwards compatibility: OrgInviteSchema points to the input schema
export const OrgInviteSchema = OrgInviteInputSchema;

export type OrgInvite = z.infer<typeof OrgInviteInputSchema>;

/**
 * Parse a single stored invite through the migration transform.
 * Centralises the OrgInviteStoredSchema → OrgInvite cast so consumers
 * don't carry the `as OrgInvite` coupling themselves.
 */
export function parseStoredInvite(data: unknown): OrgInvite {
    return OrgInviteStoredSchema.parse(data) as OrgInvite;
}

/** Array variant of {@link parseStoredInvite}. */
export function parseStoredInvites(data: unknown): OrgInvite[] {
    return OrgInviteStoredSchema.array().parse(data) as OrgInvite[];
}

// Response schema for API boundaries (single invite or array)
export const OrgInviteResponseSchema = createResponseSchema(z.union([OrgInviteSchema, OrgInviteSchema.array()]));
export const OrgInviteStoredResponseSchema = createResponseSchema(
    z.union([OrgInviteStoredSchema, OrgInviteStoredSchema.array()])
);
export type OrgInviteResponse = z.infer<typeof OrgInviteResponseSchema>;
