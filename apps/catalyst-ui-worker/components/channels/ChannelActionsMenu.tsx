'use client';

import { Menu, MenuButton, MenuList, MenuItem, IconButton, Portal } from '@chakra-ui/react';
import { EllipsisHorizontalIcon } from '@heroicons/react/20/solid';

export interface ChannelActionsMenuProps {
    /** Unique identifier for the channel */
    channelId: string;
    /** Whether the channel is owned by the current user's organization */
    isOwned: boolean;
    /** Whether the user has permission to check compliance */
    canCheckCompliance: boolean;
    /** Whether a compliance check is currently in progress */
    isCheckingCompliance: boolean;
    /** Whether a compliance result already exists (changes label to "Retry") */
    hasComplianceResult: boolean;
    /** Callback when "View Channel" is clicked */
    onView: () => void;
    /** Callback when "Check Compliance" is clicked */
    onCheckCompliance: () => void;
    /** Callback when "Delete Channel" is clicked */
    onDelete: () => void;
}

/**
 * Dropdown menu for channel row actions.
 *
 * Shows different options based on ownership and permissions:
 * - View Channel: Always visible
 * - Check Compliance: Only for owned channels when user has permission
 * - Delete Channel: Only for owned channels
 */
export function ChannelActionsMenu({
    channelId,
    isOwned,
    canCheckCompliance,
    isCheckingCompliance,
    hasComplianceResult,
    onView,
    onCheckCompliance,
    onDelete,
}: ChannelActionsMenuProps) {
    const complianceLabel = hasComplianceResult ? 'Retry compliance check' : 'Check Compliance';

    return (
        <Menu placement="bottom-end" strategy="fixed">
            <MenuButton
                as={IconButton}
                data-testid={`channels-row-${channelId}-menu-button`}
                icon={<EllipsisHorizontalIcon width={20} height={20} />}
                variant="ghost"
                size="sm"
                aria-label={`Actions for channel ${channelId}`}
                className="row-actions-button"
            />
            <Portal>
                <MenuList zIndex={1000}>
                    {/* View Channel - always visible */}
                    <MenuItem onClick={onView} color="#0A0A0A" data-testid={`channels-row-${channelId}-view-button`}>
                        View Channel
                    </MenuItem>

                    {/* Check Compliance - only for owned channels with permissions */}
                    {isOwned && canCheckCompliance && (
                        <MenuItem
                            onClick={onCheckCompliance}
                            isDisabled={isCheckingCompliance}
                            color="#0A0A0A"
                            data-testid={`channels-row-${channelId}-compliance-button`}
                        >
                            {complianceLabel}
                        </MenuItem>
                    )}

                    {/* Delete Channel - only for owned channels */}
                    {isOwned && (
                        <MenuItem
                            color="#710909"
                            onClick={onDelete}
                            data-testid={`channels-row-${channelId}-delete-button`}
                        >
                            Delete Channel
                        </MenuItem>
                    )}
                </MenuList>
            </Portal>
        </Menu>
    );
}
