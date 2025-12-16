'use client';

import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'error' | 'pending' | 'not_checked';

export interface ChannelComplianceBadgeProps {
    /** The compliance status of the channel */
    status?: ComplianceStatus;
    /** Whether this badge is for an owned channel (non-owned channels don't show compliance) */
    isOwned: boolean;
    /** Optional test ID for testing purposes */
    'data-testid'?: string;
}

/**
 * Displays the compliance status of a data channel.
 *
 * Only renders for owned channels. Shows icon + text with appropriate colors:
 * - Compliant: Green checkmark + "Compliant"
 * - Non-compliant/Error: Red X + "Non-compliant"
 * - Pending: Gray clock + "Verifying..."
 * - Not Checked: Gray text (no icon)
 */
export function ChannelComplianceBadge({
    status,
    isOwned,
    'data-testid': testId,
}: ChannelComplianceBadgeProps) {
    // Don't render for non-owned channels
    if (!isOwned) {
        return null;
    }

    const color = getComplianceColor(status);
    const label = getComplianceLabel(status);
    const Icon = getComplianceIcon(status);

    return (
        <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color }}
            data-testid={testId}
            data-status={status}
        >
            {Icon && <Icon width={16} height={16} aria-hidden="true" />}
            <span>{label}</span>
        </span>
    );
}

/**
 * Returns the text color for a given compliance status.
 */
export function getComplianceColor(status?: ComplianceStatus): string {
    switch (status) {
        case 'compliant':
            return '#026117'; // o2-ui positive/green-100
        case 'non_compliant':
        case 'error':
            return '#710909'; // o2-ui danger/red-100
        case 'pending':
            return 'gray.500';
        default:
            return 'gray.400';
    }
}

/**
 * Returns the icon component for a given compliance status.
 */
export function getComplianceIcon(status?: ComplianceStatus): typeof CheckCircleIcon | null {
    switch (status) {
        case 'compliant':
            return CheckCircleIcon;
        case 'non_compliant':
        case 'error':
            return XCircleIcon;
        case 'pending':
            return ClockIcon;
        default:
            return null;
    }
}

/**
 * Returns the display label for a given compliance status.
 */
export function getComplianceLabel(status?: ComplianceStatus): string {
    switch (status) {
        case 'compliant':
            return 'Compliant';
        case 'non_compliant':
            return 'Non-compliant';
        case 'error':
            return 'Error';
        case 'pending':
            return 'Verifying...';
        default:
            return 'Not Checked';
    }
}
