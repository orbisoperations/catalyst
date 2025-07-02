import { z } from 'zod';
import { defineResult } from '../helpers/result';

export const JWTSigningRequest = z.object({
    entity: z.string(),
    claims: z.array(z.string()),
    expiresIn: z.number().optional(),
});
export type JWTSigningRequest = z.infer<typeof JWTSigningRequest>;

export const JWTSigningSuccess = z.object({
    success: z.literal(true),
    token: z.string(),
    expiration: z.number(),
});

export const JWTSigningError = z.object({
    success: z.literal(false),
    error: z.string(),
});

export const JWTSigningResponse = z.discriminatedUnion('success', [JWTSigningSuccess, JWTSigningError]);
export type JWTSigningResponse = z.infer<typeof JWTSigningResponse>;

// Alternative helpers-based result (optional)
export const JWTSigningResult = defineResult(z.object({ token: z.string(), expiration: z.number() }));
export type JWTSigningResult = z.infer<typeof JWTSigningResult>;
