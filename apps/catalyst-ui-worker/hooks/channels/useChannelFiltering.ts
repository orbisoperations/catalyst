import { useState, useCallback } from 'react';
import { DataChannel } from '@catalyst/schemas';
import { filterChannels, type FilterMode } from '@/lib/channel-utils';

export interface UseChannelFilteringOptions {
    onFilterChange?: () => void;
}

export interface UseChannelFilteringReturn {
    filterMode: FilterMode;
    search: string;
    setSearch: (term: string) => void;
    setFilterMode: (mode: FilterMode) => void;
    applyFilters: (channels: DataChannel[], userOrg?: string) => DataChannel[];
    clearFilters: () => void;
}

export function useChannelFiltering(options: UseChannelFilteringOptions = {}): UseChannelFilteringReturn {
    const { onFilterChange } = options;

    const [filterMode, setFilterModeState] = useState<FilterMode>('all');
    const [search, setSearch] = useState('');

    const setFilterMode = useCallback(
        (mode: FilterMode) => {
            setFilterModeState(mode);
            onFilterChange?.();
        },
        [onFilterChange]
    );

    const applyFilters = useCallback(
        (channels: DataChannel[], userOrg?: string): DataChannel[] => {
            return filterChannels(channels, filterMode, search, userOrg);
        },
        [filterMode, search]
    );

    const clearFilters = useCallback(() => {
        setFilterModeState('all');
        setSearch('');
        onFilterChange?.();
    }, [onFilterChange]);

    return {
        filterMode,
        search,
        setSearch,
        setFilterMode,
        applyFilters,
        clearFilters,
    };
}
