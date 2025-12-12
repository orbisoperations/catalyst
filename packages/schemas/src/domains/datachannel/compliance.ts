import { z } from 'zod';

/**
 * Data Channel Compliance Schemas
 *
 * Schemas for verifying data channel endpoints meet compliance requirements
 */

/**
 * JWT Test Details - Individual test results for authentication compliance
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
 * Test Type - Types of compliance tests performed on channels
 */
export const TestTypeSchema = z.enum([
    'authentication_compliance',
    'schema_introspection',
    'federation_support',
    'schema_compliance',
]);

export type TestType = z.infer<typeof TestTypeSchema>;

/**
 * Test Result - Individual compliance test result
 */
export const TestResultSchema = z.object({
    testType: TestTypeSchema,
    success: z.boolean(),
    duration: z.number(),
    errorDetails: z.string().optional(),
    jwtTestDetails: JWTTestDetailsSchema.optional(),
});

export type TestResult = z.infer<typeof TestResultSchema>;

/**
 * Compliance Status - Possible states for channel compliance
 */
export const COMPLIANCE_STATUSES = ['compliant', 'non_compliant', 'error', 'pending', 'not_checked'] as const;

export const ComplianceStatusSchema = z.enum(COMPLIANCE_STATUSES);

export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

/**
 * Human-readable labels for compliance statuses
 */
export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
    compliant: 'Compliant',
    non_compliant: 'Non-Compliant',
    error: 'Error',
    pending: 'Checking',
    not_checked: 'Not Checked',
};

/**
 * Compliance Result - Complete compliance result for a channel
 */
export const ComplianceResultSchema = z.object({
    channelId: z.string(),
    status: ComplianceStatusSchema,
    timestamp: z.number(),
    error: z.string().optional(),
    details: z.object({
        endpoint: z.string(),
        organizationId: z.string(),
        duration: z.number(),
        tests: z.array(TestResultSchema),
        authenticationCompliance: z.boolean().optional(),
        authenticationError: z.string().optional(),
    }),
});

export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;

/**
 * Compliance Report - Bulk compliance report for multiple channels
 */
export const ComplianceReportSchema = z.object({
    timestamp: z.number(),
    totalChannels: z.number(),
    compliantChannels: z.number(),
    nonCompliantChannels: z.number(),
    errorChannels: z.number(),
    results: z.array(ComplianceResultSchema),
});

export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;

/**
 * Compliance Request - Request to check channel compliance
 */
export const ComplianceRequestSchema = z.object({
    channelId: z.string(),
    endpoint: z.string().url(),
    organizationId: z.string(),
});

export type ComplianceRequest = z.infer<typeof ComplianceRequestSchema>;
