import { z } from 'zod/v4';
import { createResponseSchema } from '../../core/common';
import { preprocess, preprocessors } from '../../core/performance';

// JWT Audience values for different token types
export const JWTAudience = z.enum([
    'catalyst:gateway', // For gateway access tokens (UI -> Gateway)
    'catalyst:datachannel', // For single-use tokens (Gateway -> Data Channel)
    'catalyst:system', // For system service tokens (Internal services)
]);
export type JWTAudience = z.infer<typeof JWTAudience>;

export const JWTSigningRequest = z.object({
    entity: preprocess(
        preprocessors.trimString,
        z
            .string()
            .min(1, 'Entity is required')
            .max(100, 'Entity too long')
            .regex(/^[a-zA-Z0-9_-]+$/, 'Entity must contain only letters, numbers, underscores, and hyphens')
    ),
    claims: z
        .array(preprocess(preprocessors.trimString, z.string().max(255, 'Claim too long')))
        .max(50, 'Maximum 50 claims allowed'),
    audience: JWTAudience.optional(), // Optional for backwards compatibility
    expiresIn: z
        .number()
        .int('Expiration must be a whole number of seconds')
        .min(60, 'Minimum expiration is 60 seconds')
        .max(86400 * 365, 'Maximum expiration is 1 year')
        .optional(),
    // Optional metadata fields for token registration
    name: preprocess(
        preprocessors.trimString,
        z.string().min(1, 'Name is required if provided').max(255, 'Name too long')
    ).optional(),
    description: preprocess(
        preprocessors.trimString,
        z.string().min(1, 'Description is required if provided').max(1000, 'Description too long')
    ).optional(),
});
export type JWTSigningRequest = z.infer<typeof JWTSigningRequest>;

// Backward-compatible response schemas
export const JWTSigningSuccess = z.object({
    success: z.literal(true),
    token: z.string().min(1, 'Token is required'),
    expiration: z.number().int('Expiration must be an integer').positive('Expiration must be positive'),
});

export const JWTSigningError = z.object({
    success: z.literal(false),
    error: z.string().min(1, 'Error message is required'),
});

export const JWTSigningResponse = z.discriminatedUnion('success', [JWTSigningSuccess, JWTSigningError]);
export type JWTSigningResponse = z.infer<typeof JWTSigningResponse>;

// Alternative standardized response schema for new code
const JWTSigningResult = z.object({
    token: z.string().min(1, 'Token is required'),
    expiration: z.number().int('Expiration must be an integer').positive('Expiration must be positive'),
});

export const JWTSigningStandardResponse = createResponseSchema(JWTSigningResult);
export type JWTSigningStandardResponse = z.infer<typeof JWTSigningStandardResponse>;
