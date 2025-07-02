import { z } from 'zod';

export const ErrorInfo = z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
});
export type ErrorInfo = z.infer<typeof ErrorInfo>;

/**
 * Base error structure for all schema-wrapped results.
 */
export const ResultError = z.object({
    success: z.literal(false),
    error: ErrorInfo,
});
export type ResultError = z.infer<typeof ResultError>;

/**
 * Utility to create the common discriminated-union result type used throughout Catalyst.
 *
 * Success:  { success: true,  data: T }
 * Failure:  { success: false, error: { code, message, details? } }
 */

export const defineResult = <T extends z.ZodTypeAny>(dataSchema: T) =>
    z.discriminatedUnion('success', [
        ResultError,
        z.object({
            success: z.literal(true),
            data: dataSchema,
        }),
    ]);
