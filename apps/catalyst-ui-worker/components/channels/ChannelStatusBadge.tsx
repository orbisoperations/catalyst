'use client';

import { Badges } from '@orbisoperations/o2-ui';
import { CheckCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline';

export type ChannelStatus = 'operational' | 'disabled';

export interface ChannelStatusBadgeProps {
    /** Whether the channel's access switch is enabled */
    accessSwitch: boolean;
    /** Optional test ID for testing purposes */
    'data-testid'?: string;
}

/**
 * Displays the operational status of a data channel.
 *
 * Shows "Operational" (green) when accessSwitch is enabled,
 * or "Disabled" (gray) when accessSwitch is disabled.
 * Works the same for both owned and partner channels.
 */
export function ChannelStatusBadge({ accessSwitch, 'data-testid': testId }: ChannelStatusBadgeProps) {
    const status = getChannelStatus(accessSwitch);
    const style = getStatusBadgeStyle(status);
    const label = getStatusLabel(status);

    return (
        <Badges style={style} data-testid={testId}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {status === 'operational' ? (
                    <CheckCircleIcon width={14} height={14} aria-hidden="true" />
                ) : (
                    <MinusCircleIcon width={14} height={14} aria-hidden="true" />
                )}
                {label}
            </span>
        </Badges>
    );
}

/**
 * Determines the channel status based on access switch.
 */
export function getChannelStatus(accessSwitch: boolean): ChannelStatus {
    return accessSwitch ? 'operational' : 'disabled';
}

/**
 * Returns the badge style for a given channel status.
 */
export function getStatusBadgeStyle(status: ChannelStatus): 'positive' | 'neutral' {
    return status === 'operational' ? 'positive' : 'neutral';
}

/**
 * Returns the display label for a given channel status.
 */
export function getStatusLabel(status: ChannelStatus): string {
    return status === 'operational' ? 'Operational' : 'Disabled';
}
