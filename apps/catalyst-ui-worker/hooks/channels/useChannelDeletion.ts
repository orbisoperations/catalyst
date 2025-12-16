import { useState, useCallback } from 'react';
import { DataChannel } from '@catalyst/schemas';

export interface UseChannelDeletionOptions {
    deleteChannel: (channelId: string, token: string) => Promise<DataChannel>;
    token?: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export interface UseChannelDeletionReturn {
    channelToDelete: string | null;
    isDeleting: boolean;
    initiateDelete: (channelId: string) => void;
    confirmDelete: () => Promise<void>;
    cancelDelete: () => void;
}

export function useChannelDeletion(options: UseChannelDeletionOptions): UseChannelDeletionReturn {
    const { deleteChannel, token, onSuccess, onError } = options;

    const [channelToDelete, setChannelToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // No useCallback needed - setState is already stable
    const initiateDelete = (channelId: string) => {
        setChannelToDelete(channelId);
    };

    const cancelDelete = () => {
        setChannelToDelete(null);
    };

    // useCallback needed here because it has dependencies and performs async work
    const confirmDelete = useCallback(async () => {
        if (!token || !channelToDelete) return;

        setIsDeleting(true);

        try {
            await deleteChannel(channelToDelete, token);
            setChannelToDelete(null);
            onSuccess?.();
        } catch (error) {
            console.error('Failed to delete channel:', error);
            onError?.(error instanceof Error ? error : new Error('Failed to delete channel'));
        } finally {
            setIsDeleting(false);
        }
    }, [channelToDelete, token, deleteChannel, onSuccess, onError]);

    return {
        channelToDelete,
        isDeleting,
        initiateDelete,
        confirmDelete,
        cancelDelete,
    };
}
