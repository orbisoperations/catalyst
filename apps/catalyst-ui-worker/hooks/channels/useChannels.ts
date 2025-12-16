import { useState, useCallback, useEffect, useRef } from 'react';
import { DataChannel } from '@catalyst/schemas';

export interface UseChannelsOptions {
    listChannels: (token: string) => Promise<DataChannel[]>;
    token?: string;
    autoFetch?: boolean;
    /** Set to false to allow fetching without a token (e.g., for mock data) */
    requireToken?: boolean;
}

export interface UseChannelsReturn {
    channels: DataChannel[];
    isLoading: boolean;
    hasError: boolean;
    refetch: () => void;
}

export function useChannels(options: UseChannelsOptions): UseChannelsReturn {
    const { listChannels, token, autoFetch = true, requireToken = true } = options;

    const [channels, setChannels] = useState<DataChannel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Use ref for listChannels to avoid recreating fetchChannels unnecessarily
    const listChannelsRef = useRef(listChannels);
    listChannelsRef.current = listChannels;

    // Internal fetch that returns cleanup (for useEffect)
    const fetchChannelsInternal = useCallback((): (() => void) | undefined => {
        if (requireToken && !token) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setHasError(false);

        // Track if this fetch is still relevant (handles race conditions)
        let cancelled = false;

        listChannelsRef
            .current(token ?? '')
            .then((data) => {
                if (!cancelled) {
                    const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
                    setChannels(sorted);
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    console.error('Failed to fetch channels:', error);
                    setHasError(true);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [token, requireToken]);

    // Public refetch - doesn't return cleanup (cleaner API for callers)
    const refetch = useCallback(() => {
        fetchChannelsInternal();
    }, [fetchChannelsInternal]);

    // Auto-fetch on mount or when token changes
    useEffect(() => {
        if (autoFetch) {
            return fetchChannelsInternal();
        }
    }, [autoFetch, fetchChannelsInternal]);

    return {
        channels,
        isLoading,
        hasError,
        refetch,
    };
}
