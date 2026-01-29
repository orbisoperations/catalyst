import { z } from 'zod/v4';
// Used for Zitadel user management and UI permissions
export const UserRole = z.enum(['platform-admin', 'org-admin', 'org-user', 'data-custodian']);
export type UserRole = z.infer<typeof UserRole>;

// Uses string array for flexibility with external Zitadel data
// Zitadel may return role strings that don't strictly match our UserRole enum
export const UserSchema = z.object({
    userId: z.string(),
    orgId: z.string(),
    zitadelRoles: z.string().array(),
});

// Type inferred from schema for consistency
export type User = z.infer<typeof UserSchema>;

// User action response schemas
const userCheckActionSuccess = z.object({
    success: z.literal(true),
    data: UserSchema,
});

const userCheckActionError = z.object({
    success: z.literal(false),
    error: z.string(),
});

export const UserCheckActionResponse = z.discriminatedUnion('success', [userCheckActionError, userCheckActionSuccess]);

export type UserCheckActionResponse = z.infer<typeof UserCheckActionResponse>;
