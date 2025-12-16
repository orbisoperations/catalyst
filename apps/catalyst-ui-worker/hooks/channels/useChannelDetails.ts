'use client';

import { useState, useCallback, useEffect } from 'react';
import { DataChannel } from '@catalyst/schemas';

export interface UseChannelDetailsOptions {
    /** Function to fetch channel details */
    channelDetails: (id: string, token: string) => Promise<DataChannel>;
    /** Channel ID to fetch */
    channelId: string | undefined;
    /** Auth token */
    token: string | undefined;
    /** Whether to fetch automatically on mount */
    autoFetch?: boolean;
}

export interface UseChannelDetailsReturn {
    /** The channel data */
    channel: DataChannel | null;
    /** Whether a fetch is in progress */
    isLoading: boolean;
    /** Whether an error occurred */
    hasError: boolean;
    /** Error message if hasError is true */
    errorMessage: string;
    /** Refetch the channel data */
    refetch: () => void;
    /** Update the local channel state (for optimistic updates) */
    setChannel: (channel: DataChannel | null) => void;
}

/**
 * Hook to fetch and manage a single channel's details.
 *
 * Handles loading states, error handling, and provides refetch capability.
 */
export function useChannelDetails({
    channelDetails,
    channelId,
    token,
    autoFetch = true,
}: UseChannelDetailsOptions): UseChannelDetailsReturn {
    const [channel, setChannel] = useState<DataChannel | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchChannel = useCallback(async () => {
        if (!channelId || !token) {
            return;
        }

        setIsLoading(true);
        setHasError(false);
        setErrorMessage('');

        try {
            const data = await channelDetails(channelId, token);
            setChannel(data);
        } catch (error) {
            console.error('Failed to fetch channel details:', error);
            setHasError(true);
            setErrorMessage('An error occurred while fetching the channel details. Does the channel exist?');
        } finally {
            setIsLoading(false);
        }
    }, [channelDetails, channelId, token]);

    // Auto-fetch on mount when dependencies are ready
    useEffect(() => {
        if (autoFetch && channelId && token) {
            fetchChannel();
        }
    }, [autoFetch, channelId, token, fetchChannel]);

    return {
        channel,
        isLoading,
        hasError,
        errorMessage,
        refetch: fetchChannel,
        setChannel,
    };
}
