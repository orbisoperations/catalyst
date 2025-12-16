'use client';

import { memo, useMemo, useCallback } from 'react';
import { Flex } from '@chakra-ui/react';
import { Caption } from '@orbisoperations/o2-ui';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface ChannelsPaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (count: number) => void;
}

const ITEMS_PER_PAGE_OPTIONS = [8, 16, 24, 32];

// Extracted style constants to avoid recreating objects on each render
const navButtonBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    border: '1px solid #d8e2ef',
};

const navButtonEnabledStyle: React.CSSProperties = {
    ...navButtonBaseStyle,
    backgroundColor: '#fff',
    cursor: 'pointer',
    opacity: 1,
};

const navButtonDisabledStyle: React.CSSProperties = {
    ...navButtonBaseStyle,
    backgroundColor: '#f5f5f5',
    cursor: 'not-allowed',
    opacity: 0.5,
};

const ellipsisStyle: React.CSSProperties = {
    padding: '0 8px',
    color: '#9CA3AF',
};

const pageButtonBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px',
    padding: '0 8px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
};

const pageButtonActiveStyle: React.CSSProperties = {
    ...pageButtonBaseStyle,
    border: '1px solid #0B3481',
    backgroundColor: '#e8f0fe',
    color: '#0B3481',
    fontWeight: 600,
};

const pageButtonInactiveStyle: React.CSSProperties = {
    ...pageButtonBaseStyle,
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    color: '#374151',
    fontWeight: 400,
};

const selectStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid #d8e2ef',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    cursor: 'pointer',
};

const textStyle: React.CSSProperties = {
    color: '#2E2E2E',
};

/**
 * Generate page numbers with ellipsis for large page counts.
 * Shows: 1 ... current-1, current, current+1 ... lastPage
 */
function generatePageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [];

    // Always show first page
    pages.push(1);

    if (current > 3) {
        pages.push('...');
    }

    // Show pages around current
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
            pages.push(i);
        }
    }

    if (current < total - 2) {
        pages.push('...');
    }

    // Always show last page
    if (!pages.includes(total)) {
        pages.push(total);
    }

    return pages;
}

/**
 * Custom pagination component with proper spacing between elements.
 * Displays: result count | page navigation | items per page selector
 *
 * Memoized to prevent unnecessary re-renders.
 */
export const ChannelsPagination = memo(function ChannelsPagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
}: ChannelsPaginationProps) {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const canGoPrev = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    // Memoize page numbers to avoid recalculating on every render
    const pageNumbers = useMemo(() => generatePageNumbers(currentPage, totalPages), [currentPage, totalPages]);

    // Stable handlers
    const handlePrevPage = useCallback(() => {
        onPageChange(currentPage - 1);
    }, [onPageChange, currentPage]);

    const handleNextPage = useCallback(() => {
        onPageChange(currentPage + 1);
    }, [onPageChange, currentPage]);

    const handleItemsPerPageChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            onItemsPerPageChange(Number(e.target.value));
        },
        [onItemsPerPageChange]
    );

    return (
        <Flex justify="space-between" align="center" w="100%" py={3} px={4}>
            {/* Page navigation */}
            <Flex align="center" gap={2}>
                <button
                    onClick={handlePrevPage}
                    disabled={!canGoPrev}
                    aria-label="Previous page"
                    style={canGoPrev ? navButtonEnabledStyle : navButtonDisabledStyle}
                >
                    <ChevronLeftIcon width={16} height={16} color="#0B3481" />
                </button>

                <Flex align="center" gap={1}>
                    {pageNumbers.map((page, idx) =>
                        page === '...' ? (
                            <span key={`ellipsis-${idx}`} style={ellipsisStyle}>
                                ...
                            </span>
                        ) : (
                            <button
                                key={page}
                                onClick={() => onPageChange(page as number)}
                                style={page === currentPage ? pageButtonActiveStyle : pageButtonInactiveStyle}
                            >
                                {page}
                            </button>
                        )
                    )}
                </Flex>

                <button
                    onClick={handleNextPage}
                    disabled={!canGoNext}
                    aria-label="Next page"
                    style={canGoNext ? navButtonEnabledStyle : navButtonDisabledStyle}
                >
                    <ChevronRightIcon width={16} height={16} color="#0B3481" />
                </button>
            </Flex>

            {/* Result count - center */}
            <span style={textStyle}>
                <Caption weight="regular">
                    Showing {startItem}-{endItem} of {totalItems} results
                </Caption>
            </span>

            {/* Items per page selector */}
            <Flex align="center" gap={2}>
                <span style={textStyle}>
                    <Caption weight="regular">Show</Caption>
                </span>
                <select value={itemsPerPage} onChange={handleItemsPerPageChange} style={selectStyle}>
                    {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
                <span style={textStyle}>
                    <Caption weight="regular">per page</Caption>
                </span>
            </Flex>
        </Flex>
    );
});
