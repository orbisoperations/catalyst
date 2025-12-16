'use client';

import { memo, useMemo, useCallback } from 'react';
import { Card, DataTable, Pagination, Heading3 } from '@orbisoperations/o2-ui';
import { SharingListToolbar } from './SharingListToolbar';
import { PartnerSharingRow, type Partner } from './PartnerSharingRow';

export interface SharingListProps {
    /** List of all partners */
    partners: Partner[];
    /** Current search term */
    search: string;
    /** Callback when search term changes */
    onSearchChange: (value: string) => void;
    /** Callback when sharing toggle is changed */
    onToggleSharing: (partnerId: string, sharing: boolean) => void;
    /** Callback when add to list button is clicked */
    onAddClick: () => void;
    /** Items per page for pagination */
    itemsPerPage?: number;
    /** Current page number (1-indexed) */
    currentPage: number;
    /** Callback when page changes */
    onPageChange: (page: number) => void;
    /** Callback when items per page changes */
    onItemsPerPageChange?: (count: number) => void;
    /** Whether loading partners */
    isLoading?: boolean;
    /** Whether there was an error fetching partners */
    hasError?: boolean;
    /** Callback to retry fetching partners */
    onRetry?: () => void;
}

/**
 * Complete sharing list section with search, table, and pagination.
 *
 * Composes SharingListToolbar, PartnerSharingRow, and Pagination components.
 * Handles filtering and pagination internally.
 *
 * Memoized to prevent unnecessary re-renders.
 */
export const SharingList = memo(function SharingList({
    partners,
    search,
    onSearchChange,
    onToggleSharing,
    onAddClick,
    itemsPerPage = 5,
    currentPage,
    onPageChange,
    isLoading = false,
    hasError = false,
    onRetry,
    onItemsPerPageChange,
}: SharingListProps) {
    // Filter partners based on search term
    const filteredPartners = useMemo(() => {
        if (!search.trim()) return partners;
        const lowerSearch = search.toLowerCase();
        return partners.filter(
            (partner) =>
                partner.name.toLowerCase().includes(lowerSearch) ||
                partner.description.toLowerCase().includes(lowerSearch)
        );
    }, [partners, search]);

    // Paginate filtered partners
    const paginatedPartners = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredPartners.slice(start, start + itemsPerPage);
    }, [filteredPartners, currentPage, itemsPerPage]);

    // Stable handler for page change
    const handlePageChange = useCallback(
        (page: number) => {
            onPageChange(page);
        },
        [onPageChange]
    );

    return (
        <Card className="p-6" data-testid="sharing-list-section">
            <div className="flex flex-col gap-4">
                {/* Header Row: Title + Toolbar */}
                <div className="flex items-center gap-4">
                    <div className="shrink-0">
                        <Heading3>Sharing List</Heading3>
                    </div>
                    <SharingListToolbar search={search} onSearchChange={onSearchChange} onAddClick={onAddClick} />
                </div>

                {/* Error State */}
                {hasError && (
                    <div
                        className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3"
                        role="alert"
                        data-testid="sharing-list-error"
                    >
                        <div className="flex items-center gap-2">
                            <svg
                                className="h-5 w-5 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span className="text-sm text-red-700">Failed to load sharing partners</span>
                        </div>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="text-sm font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                type="button"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                )}

                {/* Table */}
                <div className="w-full overflow-x-auto">
                    <DataTable size="medium" interactive className="w-full">
                        <DataTable.Header>
                            <DataTable.Row>
                                <DataTable.HeaderCell className="min-w-[200px]">Partner</DataTable.HeaderCell>
                                <DataTable.HeaderCell className="min-w-[300px]">Description</DataTable.HeaderCell>
                                <DataTable.HeaderCell alignment="center" className="min-w-[120px]">
                                    Sharing
                                </DataTable.HeaderCell>
                            </DataTable.Row>
                        </DataTable.Header>
                        <DataTable.Body>
                            {paginatedPartners.length > 0 ? (
                                paginatedPartners.map((partner) => (
                                    <PartnerSharingRow
                                        key={partner.id}
                                        partner={partner}
                                        onToggle={onToggleSharing}
                                        isDisabled={isLoading}
                                    />
                                ))
                            ) : (
                                <DataTable.Row>
                                    <DataTable.Cell alignment="left">
                                        <span className="text-gray-500">
                                            {search ? 'No partners found' : 'No partners in sharing list'}
                                        </span>
                                    </DataTable.Cell>
                                    <DataTable.Cell alignment="left">
                                        <span />
                                    </DataTable.Cell>
                                    <DataTable.Cell alignment="center">
                                        <span />
                                    </DataTable.Cell>
                                </DataTable.Row>
                            )}
                        </DataTable.Body>
                    </DataTable>
                </div>

                {/* Pagination */}
                {filteredPartners.length > 0 && (
                    <div className="flex justify-end">
                        <Pagination
                            selected={currentPage}
                            totalResults={filteredPartners.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={onItemsPerPageChange ?? (() => {})}
                            showResultCount
                        />
                    </div>
                )}
            </div>
        </Card>
    );
});

// Re-export Partner type for consumers
export type { Partner } from './PartnerSharingRow';
