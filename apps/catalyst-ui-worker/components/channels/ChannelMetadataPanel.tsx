'use client';

import { memo, useCallback } from 'react';
import { Loading } from '@orbisoperations/o2-ui';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { ChannelStatusBadge } from './ChannelStatusBadge';
import { ChannelComplianceBadge, type ComplianceStatus } from './ChannelComplianceBadge';

export interface ChannelMetadataPanelProps {
    /** Whether the channel's access switch is enabled */
    accessSwitch: boolean;
    /** Current compliance status */
    complianceStatus?: ComplianceStatus;
    /** Whether this is an owned channel (affects compliance display) */
    isOwned: boolean;
    /** Channel type (e.g., 'API') */
    channelType?: string;
    /** Creation date formatted string */
    createdOn?: string;
    /** Last updated date formatted string */
    updatedOn?: string;
    /** Callback when refresh compliance is clicked */
    onRefreshCompliance?: () => void;
    /** Whether compliance check is in progress */
    isRefreshingCompliance?: boolean;
}

interface MetadataRowProps {
    label: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    testId?: string;
}

/**
 * A single row in the metadata panel with label and value on the same line.
 */
const MetadataRow = memo(function MetadataRow({ label, children, action, testId }: MetadataRowProps) {
    return (
        <div className="flex items-center gap-2" data-testid={testId}>
            <span className="text-sm font-semibold text-gray-700">{label}</span>
            {children}
            {action}
        </div>
    );
});

/**
 * Metadata panel displaying channel status, compliance, type, and timestamps.
 *
 * Reuses ChannelStatusBadge and ChannelComplianceBadge for consistent styling.
 * Memoized to prevent unnecessary re-renders.
 */
export const ChannelMetadataPanel = memo(function ChannelMetadataPanel({
    accessSwitch,
    complianceStatus,
    isOwned,
    channelType = 'API',
    createdOn,
    updatedOn,
    onRefreshCompliance,
    isRefreshingCompliance = false,
}: ChannelMetadataPanelProps) {
    const handleRefreshClick = useCallback(() => {
        if (onRefreshCompliance && !isRefreshingCompliance) {
            onRefreshCompliance();
        }
    }, [onRefreshCompliance, isRefreshingCompliance]);

    return (
        <div className="flex flex-col gap-3 w-[366px] h-[202px]">
            {/* Channel Status */}
            <MetadataRow label="Channel Status:" testId="channel-metadata-status">
                <ChannelStatusBadge accessSwitch={accessSwitch} data-testid="channel-status-badge" />
            </MetadataRow>

            {/* Validity/Compliance - only shown for owned channels */}
            {isOwned && (
                <MetadataRow
                    label="Validity:"
                    testId="channel-metadata-validity"
                    action={
                        onRefreshCompliance && (
                            <button
                                type="button"
                                aria-label="Refresh Compliance"
                                onClick={handleRefreshClick}
                                disabled={isRefreshingCompliance}
                                className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                data-testid="channel-refresh-compliance-button"
                            >
                                {isRefreshingCompliance ? (
                                    <Loading size="small" />
                                ) : (
                                    <ArrowPathIcon width={16} height={16} className="text-gray-600" />
                                )}
                            </button>
                        )
                    }
                >
                    <ChannelComplianceBadge
                        status={complianceStatus}
                        isOwned={isOwned}
                        data-testid="channel-compliance-badge"
                    />
                </MetadataRow>
            )}

            {/* Channel Type */}
            <MetadataRow label="Channel Type:" testId="channel-metadata-type">
                <span className="text-sm text-gray-700">{channelType}</span>
            </MetadataRow>

            {/* Created On */}
            {createdOn && (
                <MetadataRow label="Created On:" testId="channel-metadata-created">
                    <span className="text-sm text-gray-700">{createdOn}</span>
                </MetadataRow>
            )}

            {/* Updated On */}
            {updatedOn && (
                <MetadataRow label="Updated On:" testId="channel-metadata-updated">
                    <span className="text-sm text-gray-700">{updatedOn}</span>
                </MetadataRow>
            )}
        </div>
    );
});
