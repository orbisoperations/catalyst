'use client';

import { memo, useCallback } from 'react';
import { TertiaryIconButton, PrimaryButton } from '@orbisoperations/o2-ui';
import { Flex } from '@chakra-ui/layout';
import { Box, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { FunnelIcon, BarsArrowDownIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';

export type SortOption = 'a-z' | 'z-a' | 'status' | 'compliance';
export type FilterOption = 'all' | 'operational' | 'disabled' | 'owned' | 'partner';

export interface ChannelListToolbarProps {
    /** Current search value */
    search: string;
    /** Currently selected sort option */
    selectedSort: SortOption | null;
    /** Currently selected filter */
    selectedFilter: FilterOption;
    /** Callback when search value changes */
    onSearchChange: (value: string) => void;
    /** Callback when search is submitted (search button clicked) */
    onSearchSubmit: () => void;
    /** Callback when a sort option is selected */
    onSortChange: (option: SortOption) => void;
    /** Callback when a filter option is selected */
    onFilterChange: (option: FilterOption) => void;
    /** Callback when create channel button is clicked */
    onCreateChannel: () => void;
}

/**
 * Toolbar for the channel list with search, sort, filter, and create controls.
 */
const baseMenuItemStyle = {
    width: '232px',
    height: '40px',
    gap: '8px',
    borderRadius: '4px',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderLeft: '4px solid transparent',
};

const selectedMenuItemStyle = {
    ...baseMenuItemStyle,
    bg: '#DCE8FF',
    borderLeft: '4px solid #0B3481',
};

const menuListBaseStyle = {
    width: '240px',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid #EBF2FB',
    boxShadow: '0px 0px 4px 2px #123B8914',
    background: '#FFFFFF',
};

const sortMenuListStyle = {
    ...menuListBaseStyle,
    height: '168px', // 4 items × 40px + 8px padding
};

const filterMenuListStyle = {
    ...menuListBaseStyle,
    height: '208px', // 5 items × 40px + 8px padding
};

/**
 * Memoized toolbar component to prevent re-renders when callbacks haven't changed.
 */
export const ChannelListToolbar = memo(function ChannelListToolbar({
    search,
    selectedSort,
    selectedFilter,
    onSearchChange,
    onSearchSubmit,
    onSortChange,
    onFilterChange,
    onCreateChannel,
}: ChannelListToolbarProps) {
    // Stable handler for input onChange
    const handleSearchInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onSearchChange(e.target.value);
        },
        [onSearchChange]
    );

    return (
        <Flex justify="space-between" align="center" data-testid="channel-list-toolbar">
            {/* Left: Search */}
            <div className="flex">
                <div className="w-[296px] h-10 flex items-center border-t border-b border-l border-r-0 border-solid border-[#D8E2EF] rounded-l-xs px-3 py-2 bg-white">
                    <input
                        type="text"
                        value={search}
                        onChange={handleSearchInputChange}
                        placeholder="Search by name"
                        aria-label="Search channels by name"
                        data-testid="channel-search-input"
                        className="w-full outline-none text-sm placeholder:text-[#4E4E4E] bg-transparent"
                    />
                </div>
                <button
                    onClick={onSearchSubmit}
                    aria-label="Search"
                    data-testid="channel-search-button"
                    className="w-10 h-10 flex items-center justify-center p-1 border border-solid border-[#A7BFEC] bg-[#DCE8FF] rounded-r-xs"
                >
                    <MagnifyingGlassIcon width={24} height={24} className="text-[#0B3481]" />
                </button>
            </div>

            {/* Right: Sort + Filter + Create */}
            <Flex gap={3}>
                {/* Sort dropdown */}
                <Menu placement="bottom-start">
                    <MenuButton
                        as={Box}
                        display="inline-block"
                        cursor="pointer"
                        aria-label="Sort channels"
                        data-testid="channel-sort-button"
                    >
                        <TertiaryIconButton>
                            <BarsArrowDownIcon width={16} height={16} />
                        </TertiaryIconButton>
                    </MenuButton>
                    <MenuList data-testid="channel-sort-menu" sx={sortMenuListStyle}>
                        <MenuItem
                            onClick={() => onSortChange('a-z')}
                            data-testid="sort-a-z"
                            sx={selectedSort === 'a-z' ? selectedMenuItemStyle : baseMenuItemStyle}
                        >
                            A-Z
                        </MenuItem>
                        <MenuItem
                            onClick={() => onSortChange('z-a')}
                            data-testid="sort-z-a"
                            sx={selectedSort === 'z-a' ? selectedMenuItemStyle : baseMenuItemStyle}
                        >
                            Z-A
                        </MenuItem>
                        <MenuItem
                            onClick={() => onSortChange('status')}
                            data-testid="sort-status"
                            sx={selectedSort === 'status' ? selectedMenuItemStyle : baseMenuItemStyle}
                        >
                            Status
                        </MenuItem>
                        <MenuItem
                            onClick={() => onSortChange('compliance')}
                            data-testid="sort-compliance"
                            sx={selectedSort === 'compliance' ? selectedMenuItemStyle : baseMenuItemStyle}
                        >
                            Compliance
                        </MenuItem>
                    </MenuList>
                </Menu>

                {/* Filter dropdown */}
                <Menu placement="bottom-start">
                    <MenuButton
                        as={Box}
                        display="inline-block"
                        cursor="pointer"
                        aria-label="Filter channels"
                        data-testid="channel-filter-button"
                    >
                        <TertiaryIconButton>
                            <FunnelIcon width={16} height={16} />
                        </TertiaryIconButton>
                    </MenuButton>
                    <MenuList data-testid="channel-filter-menu" sx={filterMenuListStyle}>
                        <MenuItem
                            onClick={() => onFilterChange('all')}
                            data-testid="filter-all"
                            sx={selectedFilter === 'all' ? selectedMenuItemStyle : baseMenuItemStyle}
                        >
                            All
                        </MenuItem>
                        <MenuItem
                            onClick={() => onFilterChange('operational')}
                            data-testid="filter-operational"
                            sx={selectedFilter === 'operational' ? selectedMenuItemStyle : baseMenuItemStyle}
                        >
                            Operational
                        </MenuItem>
                        <MenuItem
                            onClick={() => onFilterChange('disabled')}
                            data-testid="filter-disabled"
                            sx={selectedFilter === 'disabled' ? selectedMenuItemStyle : baseMenuItemStyle}
                        >
                            Disabled
                        </MenuItem>
                        <MenuItem
                            onClick={() => onFilterChange('owned')}
                            data-testid="filter-owned"
                            sx={selectedFilter === 'owned' ? selectedMenuItemStyle : baseMenuItemStyle}
                        >
                            Owned by organization
                        </MenuItem>
                        <MenuItem
                            onClick={() => onFilterChange('partner')}
                            data-testid="filter-partner"
                            sx={selectedFilter === 'partner' ? selectedMenuItemStyle : baseMenuItemStyle}
                        >
                            Owned by partner
                        </MenuItem>
                    </MenuList>
                </Menu>

                {/* Create button */}
                <PrimaryButton
                    showIcon
                    icon={<PlusIcon width={16} height={16} />}
                    onClick={onCreateChannel}
                    data-testid="channels-create-button"
                >
                    Create
                </PrimaryButton>
            </Flex>
        </Flex>
    );
});
