import { z } from 'zod/v4';
import { preprocess, preprocessors } from '../../core/performance';

export const JWTSigningRequestSchema = z.object({
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
    expiresIn: z
        .number()
        .int('Expiration must be a whole number of seconds')
        .min(60, 'Minimum expiration is 60 seconds')
        .max(86400 * 365, 'Maximum expiration is 1 year')
        .optional(),
});
export type JWTSigningRequest = z.infer<typeof JWTSigningRequestSchema>;

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
