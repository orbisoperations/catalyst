/**
 * Issued JWT Registry schemas and types
 *
 * Schemas follow the naming convention:
 * - Runtime validators: `*Schema` suffix
 * - Inferred types: No suffix
 */
import { z } from 'zod/v4';
import { JWTRegisterStatusEnum } from '../../constants/statuses';

// Re-export for backward compatibility
export const JWTRegisterStatus = JWTRegisterStatusEnum;
export type JWTRegisterStatus = z.infer<typeof JWTRegisterStatusEnum>;

// Strict schema for validating new input (create operations)
export const IssuedJWTRegistryInputSchema = z.object({
    id: z.string().min(1, 'ID is required').max(100, 'ID too long'),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
    description: z.string().min(1, 'Description is required').max(500, 'Description too long').trim(),
    claims: z
        .array(z.string())
        .max(50, 'Maximum 50 claims allowed')
        .refine((claims) => claims.every((claim) => claim.length <= 255), 'Each claim must be 255 characters or less'),
    expiry: z.date(),
    organization: z.string().min(1, 'Organization is required').max(100, 'Organization ID too long'),
    status: JWTRegisterStatus.default(JWTRegisterStatus.enum.active),
});

// Lenient schema for parsing stored data (allows empty descriptions for old data)
// Coerces date strings from storage to Date objects
export const IssuedJWTRegistryStoredSchema = z.object({
    id: z.string().min(1, 'ID is required').max(100, 'ID too long'),
    name: z.string().max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long'),
    claims: z
        .array(z.string())
        .max(50, 'Maximum 50 claims allowed')
        .refine((claims) => claims.every((claim) => claim.length <= 255), 'Each claim must be 255 characters or less'),
    expiry: z.coerce.date(),
    organization: z.string().min(1, 'Organization is required').max(100, 'Organization ID too long'),
    status: JWTRegisterStatus.default(JWTRegisterStatus.enum.active),
});

// Backwards compatibility: IssuedJWTRegistrySchema points to the input schema
export const IssuedJWTRegistrySchema = IssuedJWTRegistryInputSchema;

// Create schema - requires expiry date to be in the future
export const CreateIssuedJWTRegistrySchema = IssuedJWTRegistryInputSchema.omit({ id: true }).extend({
    expiry: z.date().refine((date) => date > new Date(), 'Expiry date must be in the future'),
});

export type IssuedJWTRegistry = z.infer<typeof IssuedJWTRegistryInputSchema>;
export type CreateIssuedJWTRegistry = z.infer<typeof CreateIssuedJWTRegistrySchema>;
