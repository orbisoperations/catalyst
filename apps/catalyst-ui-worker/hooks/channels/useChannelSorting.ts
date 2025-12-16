import { useState, useCallback, useMemo } from 'react';
import { DataChannel, ComplianceResult } from '@catalyst/schemas';
import { sortChannels, type SortColumn, type SortDirection } from '@/lib/channel-utils';

export type SortMenuOption = 'a-z' | 'z-a' | 'status' | 'compliance';

export interface UseChannelSortingOptions {
    onSortChange?: () => void;
}

export interface UseChannelSortingReturn {
    sortColumn: SortColumn | null;
    sortDirection: SortDirection | null;
    sortMenuOption: SortMenuOption | null;
    handleSort: (column: SortColumn) => void;
    handleSortMenu: (option: SortMenuOption) => void;
    getSortedChannels: (channels: DataChannel[], complianceResults?: Record<string, ComplianceResult>) => DataChannel[];
    clearSort: () => void;
}

export function useChannelSorting(options: UseChannelSortingOptions = {}): UseChannelSortingReturn {
    const { onSortChange } = options;

    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection | null>(null);

    const handleSort = useCallback(
        (column: SortColumn) => {
            if (sortColumn === column) {
                if (sortDirection === 'asc') {
                    setSortDirection('desc');
                } else if (sortDirection === 'desc') {
                    setSortDirection(null);
                    setSortColumn(null);
                } else {
                    setSortDirection('asc');
                }
            } else {
                setSortColumn(column);
                setSortDirection('asc');
            }
            onSortChange?.();
        },
        [sortColumn, sortDirection, onSortChange]
    );

    const handleSortMenu = useCallback(
        (option: SortMenuOption) => {
            switch (option) {
                case 'a-z':
                    setSortColumn('name');
                    setSortDirection('asc');
                    break;
                case 'z-a':
                    setSortColumn('name');
                    setSortDirection('desc');
                    break;
                case 'status':
                    setSortColumn('status');
                    setSortDirection('asc');
                    break;
                case 'compliance':
                    setSortColumn('compliance');
                    setSortDirection('asc');
                    break;
            }
            onSortChange?.();
        },
        [onSortChange]
    );

    const clearSort = useCallback(() => {
        setSortColumn(null);
        setSortDirection(null);
        onSortChange?.();
    }, [onSortChange]);

    const getSortedChannels = useCallback(
        (channels: DataChannel[], complianceResults: Record<string, ComplianceResult> = {}): DataChannel[] => {
            return sortChannels(channels, sortColumn, sortDirection, complianceResults);
        },
        [sortColumn, sortDirection]
    );

    // Derive the current sort menu option from column and direction
    const sortMenuOption = useMemo((): SortMenuOption | null => {
        if (!sortColumn) return null;
        if (sortColumn === 'name' && sortDirection === 'asc') return 'a-z';
        if (sortColumn === 'name' && sortDirection === 'desc') return 'z-a';
        if (sortColumn === 'status') return 'status';
        if (sortColumn === 'compliance') return 'compliance';
        return null;
    }, [sortColumn, sortDirection]);

    return {
        sortColumn,
        sortDirection,
        sortMenuOption,
        handleSort,
        handleSortMenu,
        getSortedChannels,
        clearSort,
    };
}
