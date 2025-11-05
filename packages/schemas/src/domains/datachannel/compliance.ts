import { z } from 'zod';

/**
 * Data Channel Compliance Schemas
 *
 * Schemas for checking and testing data channel endpoint health and compliance.
 * These schemas are used by the data-channel-certifier service to perform
 * endpoint health checks, authentication compliance testing, and federation support validation.
 */

/**
 * JWT Authentication Test Details - Individual test results for authentication compliance
 */
export const JWTAuthenticationDetailsSchema = z.object({
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

export type JWTAuthenticationDetails = z.infer<typeof JWTAuthenticationDetailsSchema>;

/**
 * Test Type - Types of compliance tests that can be performed
 */
export const TestTypeSchema = z.enum(['authentication_compliance', 'schema_introspection', 'federation_support']);

export type TestType = z.infer<typeof TestTypeSchema>;

/**
 * Test Result - Individual compliance test result
 */
export const TestResultSchema = z.object({
    testType: TestTypeSchema,
    success: z.boolean(),
    duration: z.number(),
    errorDetails: z.string().optional(),
    jwtAuthenticationDetails: JWTAuthenticationDetailsSchema.optional(),
});

export type TestResult = z.infer<typeof TestResultSchema>;

/**
 * Compliance Status - Possible compliance states for a data channel
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
    pending: 'Pending',
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
 * Compliance Report - Bulk compliance report
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
 * Compliance Request - Request to check compliance of a channel
 */
export const ComplianceRequestSchema = z.object({
    channelId: z.string(),
    endpoint: z.url(),
    organizationId: z.string(),
});

export type ComplianceRequest = z.infer<typeof ComplianceRequestSchema>;
