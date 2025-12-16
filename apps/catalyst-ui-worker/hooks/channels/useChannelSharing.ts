'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Partner } from '@/components/channels/PartnerSharingRow';
import {
    getChannelPartners,
    shareChannelWithPartner,
    removeChannelPartner,
    type ChannelPartner,
} from '@/app/actions/channels';

export interface UseChannelSharingOptions {
    /** Channel ID to manage sharing for */
    channelId?: string;
    /** User token for API calls */
    token?: string | null;
    /** Items per page for pagination */
    itemsPerPage?: number;
}

export interface UseChannelSharingReturn {
    /** All partners */
    partners: Partner[];
    /** Whether loading partners */
    isLoading: boolean;
    /** Current search term */
    search: string;
    /** Set search term */
    setSearch: (value: string) => void;
    /** Current page (1-indexed) */
    currentPage: number;
    /** Set current page */
    setCurrentPage: (page: number) => void;
    /** Items per page for pagination */
    itemsPerPage: number;
    /** Set items per page */
    setItemsPerPage: (count: number) => void;
    /** Toggle sharing for a partner */
    toggleSharing: (partnerId: string, sharing: boolean) => Promise<void>;
    /** Add a partner to the sharing list */
    addPartner: (partnerId: string) => Promise<void>;
    /** Reset search and page */
    resetFilters: () => void;
    /** Refresh partners from API */
    refresh: () => Promise<void>;
    /** Whether there was an error fetching partners */
    hasError: boolean;
}

/**
 * Convert API ChannelPartner to UI Partner type.
 */
function toPartner(apiPartner: ChannelPartner): Partner {
    return {
        id: apiPartner.id,
        name: apiPartner.name || apiPartner.id, // Fallback to ID if name not provided
        description: apiPartner.description || '',
        sharing: apiPartner.sharing,
    };
}

/**
 * Hook to manage channel sharing state and operations.
 *
 * Fetches partners from the backend API and manages sharing toggles
 * with optimistic updates and rollback on error.
 */
export function useChannelSharing({
    channelId,
    token,
    itemsPerPage: initialItemsPerPage = 5,
}: UseChannelSharingOptions = {}): UseChannelSharingReturn {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [search, setSearchState] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage);

    // Ref for atomic operation lock (prevents race conditions)
    const pendingOperationRef = useRef<string | null>(null);

    // Ref to track current partners for stable rollback (avoids stale closure)
    const partnersRef = useRef(partners);
    useEffect(() => {
        partnersRef.current = partners;
    }, [partners]);

    // Fetch partners from API
    const fetchPartners = useCallback(async () => {
        if (!channelId || !token) {
            setPartners([]);
            return;
        }

        setIsLoading(true);
        setHasError(false);

        try {
            const apiPartners = await getChannelPartners(channelId, token);
            setPartners(apiPartners.map(toPartner));
        } catch (error) {
            console.error('Failed to fetch channel partners:', error);
            setHasError(true);
            setPartners([]);
        } finally {
            setIsLoading(false);
        }
    }, [channelId, token]);

    // Fetch partners on mount and when dependencies change
    useEffect(() => {
        fetchPartners();
    }, [fetchPartners]);

    // Reset to first page when search changes
    const handleSearchChange = useCallback((value: string) => {
        setSearchState(value);
        setCurrentPage(1);
    }, []);

    // Handle items per page change (reset to first page)
    const handleItemsPerPageChange = useCallback((count: number) => {
        setItemsPerPageState(count);
        setCurrentPage(1);
    }, []);

    // Toggle sharing for a specific partner
    const toggleSharing = useCallback(
        async (partnerId: string, sharing: boolean): Promise<void> => {
            if (!channelId || !token) {
                console.error('Cannot toggle sharing: missing channelId or token');
                return;
            }

            // Atomic check-and-set using ref to prevent race conditions
            if (pendingOperationRef.current !== null) {
                console.warn('Toggle sharing skipped: operation in progress for', pendingOperationRef.current);
                return;
            }
            pendingOperationRef.current = partnerId;

            // Store previous state for rollback (use ref for current value, avoids stale closure)
            const previousPartners = partnersRef.current;

            // Optimistic update
            setPartners((prev) => prev.map((p) => (p.id === partnerId ? { ...p, sharing } : p)));

            setIsLoading(true);

            try {
                let result;
                if (sharing) {
                    result = await shareChannelWithPartner(channelId, partnerId, token);
                } else {
                    result = await removeChannelPartner(channelId, partnerId, token);
                }

                if (!result.success) {
                    console.error('Failed to toggle sharing:', result.error);
                    // Rollback on error
                    setPartners(previousPartners);
                    throw new Error(result.error || 'Failed to toggle sharing');
                }
            } catch (error) {
                // Rollback on error
                setPartners(previousPartners);
                throw error;
            } finally {
                pendingOperationRef.current = null;
                setIsLoading(false);
            }
        },
        [channelId, token] // Removed partners - using partnersRef instead
    );

    // Add a partner to the sharing list
    const addPartner = useCallback(
        async (partnerId: string): Promise<void> => {
            if (!channelId || !token) {
                console.error('Cannot add partner: missing channelId or token');
                return;
            }

            setIsLoading(true);

            try {
                const result = await shareChannelWithPartner(channelId, partnerId, token);

                if (!result.success) {
                    console.error('Failed to add partner:', result.error);
                    throw new Error(result.error || 'Failed to add partner');
                }

                // Refresh the partners list to get the updated data
                await fetchPartners();
            } catch (error) {
                console.error('Failed to add partner:', error);
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [channelId, token, fetchPartners]
    );

    // Reset filters
    const resetFilters = useCallback(() => {
        setSearchState('');
        setCurrentPage(1);
    }, []);

    return {
        partners,
        isLoading,
        search,
        setSearch: handleSearchChange,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage: handleItemsPerPageChange,
        toggleSharing,
        addPartner,
        resetFilters,
        refresh: fetchPartners,
        hasError,
    };
}
