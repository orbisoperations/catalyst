import { z } from 'zod/v4';

// Base error schema
export const BaseErrorSchema = z.object({
    success: z.literal(false),
    error: z.string(),
});

export type BaseError = z.infer<typeof BaseErrorSchema>;

// Common response pattern
export const PermissionCheckResponse = z.object({
    success: z.boolean(),
    error: z.string().optional(),
});
export const PermissionCheckResponseSchema = PermissionCheckResponse;

export type PermissionCheckResponse = z.infer<typeof PermissionCheckResponseSchema>;

// Generic response builder for discriminated unions
export const createSuccessResponse = <T>(dataSchema: z.ZodType<T>) =>
    z.object({
        success: z.literal(true),
        data: dataSchema,
    });

export const createErrorResponse = () =>
    z.object({
        success: z.literal(false),
        error: z.string(),
    });

export const createResponseSchema = <T>(dataSchema: z.ZodType<T>) =>
    z.discriminatedUnion('success', [createSuccessResponse(dataSchema), createErrorResponse()]);

// Re-export standard durations from constants
export { DEFAULT_STANDARD_DURATIONS } from '../constants/durations';
