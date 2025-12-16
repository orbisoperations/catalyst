'use client';

import { memo, useCallback } from 'react';
import { DataTable } from '@orbisoperations/o2-ui';
import Link from 'next/link';
import { ChannelStatusBadge } from './ChannelStatusBadge';
import { ChannelComplianceBadge, type ComplianceStatus } from './ChannelComplianceBadge';
import { ChannelActionsMenu } from './ChannelActionsMenu';
import type { DataChannel } from '@catalyst/schemas';

export interface ChannelTableRowProps {
    /** The channel data to display */
    channel: DataChannel;
    /** Whether the channel is owned by the current user's organization */
    isOwned: boolean;
    /** Current compliance status for this channel */
    complianceStatus?: ComplianceStatus;
    /** Whether a compliance check is currently in progress */
    isCheckingCompliance: boolean;
    /** Whether this channel has a compliance result */
    hasComplianceResult: boolean;
    /** Whether the user has permission to check compliance */
    canCheckCompliance: boolean;
    /** Callback when the row is clicked - receives channelId */
    onView: (channelId: string) => void;
    /** Callback when "Check Compliance" is clicked - receives channel */
    onCheckCompliance: (channel: DataChannel) => void;
    /** Callback when "Delete Channel" is clicked - receives channelId */
    onDelete: (channelId: string) => void;
}

/**
 * A table row displaying a single data channel with its status, compliance, and actions.
 *
 * Composes ChannelStatusBadge, ChannelComplianceBadge, and ChannelActionsMenu.
 *
 * Memoized to prevent re-renders when parent state changes but row props are the same.
 */
export const ChannelTableRow = memo(function ChannelTableRow({
    channel,
    isOwned,
    complianceStatus,
    isCheckingCompliance,
    hasComplianceResult,
    canCheckCompliance,
    onView,
    onCheckCompliance,
    onDelete,
}: ChannelTableRowProps) {
    // Stable callback that uses channel.id from props
    const handleRowClick = useCallback(
        (e: React.MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-actions-menu]')) {
                onView(channel.id);
            }
        },
        [onView, channel.id]
    );

    // Stable callbacks for actions menu
    const handleView = useCallback(() => {
        onView(channel.id);
    }, [onView, channel.id]);

    const handleCheckCompliance = useCallback(() => {
        onCheckCompliance(channel);
    }, [onCheckCompliance, channel]);

    const handleDelete = useCallback(() => {
        onDelete(channel.id);
    }, [onDelete, channel.id]);

    return (
        <DataTable.Row data-testid={`channels-row-${channel.id}`}>
            {/* Clickable overlay for the row */}
            <DataTable.Cell alignment="left">
                <div
                    onClick={handleRowClick}
                    className="cursor-pointer"
                    data-testid={`channels-row-${channel.id}-name`}
                >
                    {channel.name}
                </div>
            </DataTable.Cell>

            {/* Description */}
            <DataTable.Cell alignment="left" className="max-w-[200px]">
                <div
                    onClick={handleRowClick}
                    className="cursor-pointer"
                    data-testid={`channels-row-${channel.id}-description`}
                >
                    {channel.description}
                </div>
            </DataTable.Cell>

            {/* Owned by */}
            <DataTable.Cell alignment="left" className="min-w-[150px]">
                <div
                    onClick={handleRowClick}
                    className="cursor-pointer"
                    data-testid={`channels-row-${channel.id}-owner`}
                >
                    {isOwned ? (
                        <span data-owned-org="true">
                            {channel.creatorOrganization}
                            {' (you)'}
                        </span>
                    ) : (
                        <Link
                            href={`/partners/${channel.creatorOrganization}`}
                            onClick={(e) => e.stopPropagation()}
                            data-partner-link="true"
                            data-testid={`channels-row-${channel.id}-partner-link`}
                        >
                            {channel.creatorOrganization}
                        </Link>
                    )}
                </div>
            </DataTable.Cell>

            {/* Status */}
            <DataTable.Cell alignment="left" className="min-w-[120px]">
                <div onClick={handleRowClick} className="cursor-pointer">
                    <ChannelStatusBadge
                        accessSwitch={channel.accessSwitch}
                        data-testid={`channels-row-${channel.id}-status-badge`}
                    />
                </div>
            </DataTable.Cell>

            {/* Compliance */}
            <DataTable.Cell alignment="left" className="min-w-[120px]">
                <div onClick={handleRowClick} className="cursor-pointer">
                    <ChannelComplianceBadge
                        isOwned={isOwned}
                        status={complianceStatus}
                        data-testid={`channels-row-${channel.id}-compliance-badge`}
                    />
                </div>
            </DataTable.Cell>

            {/* Actions Menu */}
            <DataTable.Cell alignment="left">
                <div data-actions-menu>
                    <ChannelActionsMenu
                        channelId={channel.id}
                        isOwned={isOwned}
                        canCheckCompliance={canCheckCompliance}
                        isCheckingCompliance={isCheckingCompliance}
                        hasComplianceResult={hasComplianceResult}
                        onView={handleView}
                        onCheckCompliance={handleCheckCompliance}
                        onDelete={handleDelete}
                    />
                </div>
            </DataTable.Cell>
        </DataTable.Row>
    );
});
