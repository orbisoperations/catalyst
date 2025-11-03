import { z } from 'zod';

/**
 * Data Channel Validation Schemas
 *
 * Schemas for certifying and validating data channel endpoints
 */

/**
 * JWT Test Details - Individual test results for JWT validation
 */
export const JWTTestDetailsSchema = z.object({
    validToken: z.object({
        accepted: z.boolean(),
        statusCode: z.number().optional(),
        error: z.string().optional(),
    }),
    invalidToken: z.object({
        accepted: z.boolean(),
        statusCode: z.number().optional(),
        error: z.string().optional(),
    }),
    noToken: z.object({
        accepted: z.boolean(),
        statusCode: z.number().optional(),
        error: z.string().optional(),
    }),
});

export type JWTTestDetails = z.infer<typeof JWTTestDetailsSchema>;

/**
 * Test Result - Individual validation test result
 */
export const TestResultSchema = z.object({
    testType: z.enum(['jwt_validation', 'introspection', 'sdl_federation', 'schema_compliance']),
    success: z.boolean(),
    duration: z.number(),
    errorDetails: z.string().optional(),
    jwtTestDetails: JWTTestDetailsSchema.optional(),
});

export type TestResult = z.infer<typeof TestResultSchema>;

/**
 * Validation Status
 */
export const ValidationStatusSchema = z.enum(['valid', 'invalid', 'error', 'pending', 'unknown']);

export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

/**
 * Validation Result - Complete validation result for a channel
 */
export const ValidationResultSchema = z.object({
    channelId: z.string(),
    status: ValidationStatusSchema,
    timestamp: z.number(),
    error: z.string().optional(),
    details: z.object({
        endpoint: z.string(),
        organizationId: z.string(),
        duration: z.number(),
        tests: z.array(TestResultSchema),
        tokenValidation: z.boolean().optional(),
        tokenValidationError: z.string().optional(),
    }),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * Validation Report - Bulk validation report
 */
export const ValidationReportSchema = z.object({
    timestamp: z.number(),
    totalChannels: z.number(),
    validChannels: z.number(),
    invalidChannels: z.number(),
    errorChannels: z.number(),
    results: z.array(ValidationResultSchema),
});

export type ValidationReport = z.infer<typeof ValidationReportSchema>;

/**
 * Validation Request - Request to validate a channel
 */
export const ValidationRequestSchema = z.object({
    channelId: z.string(),
    endpoint: z.string().url(),
    organizationId: z.string(),
});

export type ValidationRequest = z.infer<typeof ValidationRequestSchema>;
