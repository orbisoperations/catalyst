'use client';

import { memo, useCallback } from 'react';
import { SecondaryButton, TextInputAndButton } from '@orbisoperations/o2-ui';
import { PlusIcon } from '@heroicons/react/24/outline';
import { SearchIcon } from 'lucide-react';

export interface SharingListToolbarProps {
    /** Current search value */
    search: string;
    /** Callback when search value changes */
    onSearchChange: (value: string) => void;
    /** Callback when add to list button is clicked */
    onAddClick: () => void;
    /** Placeholder text for search input */
    searchPlaceholder?: string;
    /** Whether the add button is disabled */
    isAddDisabled?: boolean;
}

/**
 * Toolbar component for the sharing list with search and add button.
 *
 * Memoized to prevent re-renders when callbacks haven't changed.
 */
export const SharingListToolbar = memo(function SharingListToolbar({
    search,
    onSearchChange,
    onAddClick,
    searchPlaceholder = 'Search partners',
    isAddDisabled = false,
}: SharingListToolbarProps) {
    const handleSearchChange = useCallback(
        (val: string) => {
            onSearchChange(val);
        },
        [onSearchChange]
    );

    return (
        <div className="flex flex-1 gap-3 items-center" data-testid="sharing-list-toolbar">
            <div className="flex-1">
                <TextInputAndButton value={search} onChange={handleSearchChange} size="medium" state="default">
                    <TextInputAndButton.Container>
                        <TextInputAndButton.Input placeholder={searchPlaceholder} data-testid="sharing-search-input" />
                        <TextInputAndButton.Button>
                            <SearchIcon width={16} height={16} />
                        </TextInputAndButton.Button>
                    </TextInputAndButton.Container>
                </TextInputAndButton>
            </div>
            <SecondaryButton
                showIcon
                icon={<PlusIcon width={16} height={16} />}
                onClick={onAddClick}
                disabled={isAddDisabled}
                data-testid="sharing-add-button"
            >
                Add to list
            </SecondaryButton>
        </div>
    );
});
