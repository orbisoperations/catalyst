import { ComplianceResult, ComplianceStatus, COMPLIANCE_STATUS_LABELS } from '@catalyst/schemas';

export type BadgeStyle = 'positive' | 'danger' | 'warning' | 'neutral';

/**
 * Map compliance status to badge style for UI display
 */
const BADGE_STYLE_MAP: Record<ComplianceStatus, BadgeStyle> = {
    compliant: 'positive',
    non_compliant: 'danger',
    error: 'danger',
    pending: 'warning',
    not_checked: 'neutral',
};

/**
 * Get the badge style for a compliance status
 */
export function getComplianceBadgeStyle(status?: ComplianceStatus): BadgeStyle {
    if (!status) return 'neutral';
    return BADGE_STYLE_MAP[status] ?? 'neutral';
}

/**
 * Get the human-readable label for a compliance status
 * Uses labels from @catalyst/schemas for consistency
 */
export function getComplianceLabel(status?: ComplianceStatus): string {
    if (!status) return COMPLIANCE_STATUS_LABELS.not_checked;
    return COMPLIANCE_STATUS_LABELS[status] ?? COMPLIANCE_STATUS_LABELS.not_checked;
}

/**
 * Create a pending compliance result for optimistic UI updates
 */
export function createPendingResult(channelId: string, endpoint: string, organizationId: string): ComplianceResult {
    return {
        channelId,
        status: 'pending',
        timestamp: Date.now(),
        details: {
            endpoint,
            organizationId,
            duration: 0,
            tests: [],
        },
    };
}

/**
 * Create an error compliance result
 */
export function createErrorResult(
    channelId: string,
    endpoint: string,
    organizationId: string,
    error: string = 'Failed to run compliance check'
): ComplianceResult {
    return {
        channelId,
        status: 'error',
        timestamp: Date.now(),
        error,
        details: {
            endpoint,
            organizationId,
            duration: 0,
            tests: [],
        },
    };
}
