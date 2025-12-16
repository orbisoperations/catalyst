import { useState, useCallback, useEffect, useMemo } from 'react';

export interface UsePaginationOptions {
    initialPage?: number;
    initialItemsPerPage?: number;
    /** localStorage key for persisting itemsPerPage. If provided, the value will be saved/restored. */
    storageKey?: string;
}

export interface UsePaginationReturn<T> {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    paginatedItems: T[];
    setCurrentPage: (page: number) => void;
    setItemsPerPage: (count: number) => void;
    resetToFirstPage: () => void;
}

/**
 * Read itemsPerPage from localStorage (client-side only)
 */
function getStoredItemsPerPage(storageKey: string | undefined, fallback: number): number {
    if (!storageKey || typeof window === 'undefined') {
        return fallback;
    }
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const parsed = parseInt(stored, 10);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
    } catch {
        // localStorage may be unavailable (e.g., private browsing)
    }
    return fallback;
}

/**
 * Save itemsPerPage to localStorage (client-side only)
 */
function saveItemsPerPage(storageKey: string | undefined, value: number): void {
    if (!storageKey || typeof window === 'undefined') {
        return;
    }
    try {
        localStorage.setItem(storageKey, String(value));
    } catch {
        // localStorage may be unavailable
    }
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}): UsePaginationReturn<T> {
    const { initialPage = 1, initialItemsPerPage = 10, storageKey } = options;

    const [currentPage, setCurrentPage] = useState(initialPage);
    const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage);
    const [isHydrated, setIsHydrated] = useState(false);

    // Hydrate from localStorage after mount (avoids SSR mismatch)
    useEffect(() => {
        if (storageKey && !isHydrated) {
            const stored = getStoredItemsPerPage(storageKey, initialItemsPerPage);
            if (stored !== initialItemsPerPage) {
                setItemsPerPageState(stored);
            }
            setIsHydrated(true);
        }
    }, [storageKey, initialItemsPerPage, isHydrated]);

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    // Sync current page when it goes out of bounds (e.g., when items are filtered/deleted)
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        } else if (currentPage < 1) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);

    // Calculate paginated items using actual currentPage (state is synced above)
    const paginatedItems = useMemo(() => {
        const safePage = Math.max(1, Math.min(currentPage, totalPages));
        const startIndex = (safePage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return items.slice(startIndex, endIndex);
    }, [items, currentPage, totalPages, itemsPerPage]);

    // Reset to first page when items per page changes, and persist to localStorage
    const setItemsPerPage = useCallback(
        (count: number) => {
            setItemsPerPageState(count);
            setCurrentPage(1);
            saveItemsPerPage(storageKey, count);
        },
        [storageKey]
    );

    const resetToFirstPage = useCallback(() => {
        setCurrentPage(1);
    }, []);

    return {
        currentPage,
        itemsPerPage,
        totalItems,
        totalPages,
        paginatedItems,
        setCurrentPage,
        setItemsPerPage,
        resetToFirstPage,
    };
}
