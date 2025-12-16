'use client';

import { memo, useCallback } from 'react';
import { SecondaryButton, Heading3 } from '@orbisoperations/o2-ui';
import { PencilSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export interface ChannelDetailHeaderProps {
    /** Channel name to display */
    channelName: string;
    /** Current connection status */
    connectionStatus: 'connected' | 'disconnected';
    /** Callback when connection status changes */
    onConnectionStatusChange: (status: 'connected' | 'disconnected') => void;
    /** Callback when edit button is clicked */
    onEditClick: () => void;
}

/**
 * Header component for the channel detail page.
 * Displays channel name, connection status dropdown, and edit button.
 *
 * Memoized to prevent re-renders when parent state changes.
 */
export const ChannelDetailHeader = memo(function ChannelDetailHeader({
    channelName,
    connectionStatus,
    onConnectionStatusChange,
    onEditClick,
}: ChannelDetailHeaderProps) {
    const handleStatusChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            onConnectionStatusChange(e.target.value as 'connected' | 'disconnected');
        },
        [onConnectionStatusChange]
    );

    return (
        <div
            className="max-w-[1096px] w-full h-[80px] p-6 flex justify-between items-center"
            style={{
                borderBottom: '1px solid #D8E2EF',
                gap: '12px',
            }}
        >
            <Heading3 data-testid="channel-detail-title">{channelName}</Heading3>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <CheckCircleIcon
                        width={16}
                        height={16}
                        color={connectionStatus === 'connected' ? 'green' : 'gray'}
                    />
                    <select
                        value={connectionStatus}
                        onChange={handleStatusChange}
                        aria-label="Connection status"
                        data-testid="channel-connection-status"
                        className="h-8 w-[120px] px-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="connected">Connected</option>
                        <option value="disconnected">Disconnected</option>
                    </select>
                </div>
                <SecondaryButton
                    showIcon
                    icon={<PencilSquareIcon width={16} height={16} />}
                    onClick={onEditClick}
                    data-testid="channel-edit-button"
                >
                    Edit
                </SecondaryButton>
            </div>
        </div>
    );
});
