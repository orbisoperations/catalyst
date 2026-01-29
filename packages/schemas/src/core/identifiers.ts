import { z } from 'zod/v4';

// Enhanced identifier schemas with proper validation
export const OrgIdSchema = z
    .string()
    .min(1, 'Organization ID cannot be empty')
    .max(100, 'Organization ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Organization ID can only contain letters, numbers, underscores, and hyphens');

export const UserIdSchema = z
    .string()
    .min(1, 'User ID cannot be empty')
    // Accept email format or alphanumeric ID
    .refine(
        (val) => z.string().email().safeParse(val).success || /^[a-zA-Z0-9_-]{3,100}$/.test(val),
        'User ID must be a valid email or alphanumeric ID (3-100 characters)'
    );

export const DataChannelIdSchema = z
    .string()
    .min(1, 'Data Channel ID cannot be empty')
    .max(100, 'Data Channel ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Data Channel ID can only contain letters, numbers, underscores, and hyphens');

// TypeScript types inferred from schemas
export type OrgId = z.infer<typeof OrgIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type DataChannelId = z.infer<typeof DataChannelIdSchema>;

// Future: Branded type implementations (commented out for compatibility)
// export const BrandedOrgIdSchema = OrgIdSchema.brand<"OrgId">();
// export const BrandedUserIdSchema = UserIdSchema.brand<"UserId">();
// export const BrandedDataChannelIdSchema = DataChannelIdSchema.brand<"DataChannelId">();
