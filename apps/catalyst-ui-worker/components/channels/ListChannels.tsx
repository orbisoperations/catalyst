'use client';

import { useCallback, useMemo } from 'react';
import { ErrorCard, NoChannelsState, ChannelNotFoundState } from '@/components/elements';
import { CreateChannelModal } from '@/components/modals';
import { DataTable, Loading, Card } from '@orbisoperations/o2-ui';
import { ChannelsPagination } from './ChannelsPagination';
import { DataChannel } from '@catalyst/schemas';
import { Flex } from '@chakra-ui/layout';
import { useDisclosure } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

// Custom hooks
import { usePagination } from '@/hooks/usePagination';
import {
    useChannels,
    useChannelSorting,
    useChannelFiltering,
    useChannelCompliance,
    useChannelDeletion,
} from '@/hooks/channels';

// Extracted components
import { ChannelListToolbar, type SortOption, type FilterOption } from './ChannelListToolbar';
import { ChannelTableRow } from './ChannelTableRow';
import { DeleteChannelModal } from './DeleteChannelModal';
import { ComplianceResultModal } from './ComplianceResultModal';

import { useUser } from '../contexts/User/UserContext';

type ListChannelsProps = {
    listChannels: (token: string) => Promise<DataChannel[]>;
    deleteChannel: (channelId: string, token: string) => Promise<DataChannel>;
    createDataChannel?: (dataChannel: DataChannel, token: string) => Promise<DataChannel>;
};

export default function DataChannelListComponents({ listChannels, deleteChannel }: ListChannelsProps) {
    const router = useRouter();
    const { token, user } = useUser();

    // Modal disclosures
    const deleteDisclosure = useDisclosure();
    const createChannelDisclosure = useDisclosure();
    const complianceDisclosure = useDisclosure();

    // Custom hooks for state management
    const { channels, isLoading, hasError, refetch } = useChannels({
        listChannels,
        token,
        autoFetch: true,
    });

    const { sortColumn, sortDirection, sortMenuOption, handleSort, handleSortMenu, getSortedChannels } =
        useChannelSorting();

    const { filterMode, search, setSearch, setFilterMode, applyFilters } = useChannelFiltering();

    const {
        complianceResults,
        checkingCompliance,
        selectedComplianceResult,
        canCheckCompliance,
        checkCompliance,
        setSelectedComplianceResult,
    } = useChannelCompliance();

    // Stable callbacks for deletion hook
    const handleDeletionSuccess = useCallback(() => {
        deleteDisclosure.onClose();
        refetch();
    }, [deleteDisclosure, refetch]);

    const handleDeletionError = useCallback(() => {
        deleteDisclosure.onClose();
    }, [deleteDisclosure]);

    const { isDeleting, initiateDelete, confirmDelete, cancelDelete } = useChannelDeletion({
        deleteChannel,
        token,
        onSuccess: handleDeletionSuccess,
        onError: handleDeletionError,
    });

    // User organization for ownership check
    const userOrg = user?.custom?.org as string | undefined;

    // Memoized ownership check function
    const isChannelOwned = useCallback((channel: DataChannel) => channel.creatorOrganization === userOrg, [userOrg]);

    // Apply filters to channels (removed redundant deps - applyFilters already captures filterMode/search)
    const filteredChannels = useMemo(() => {
        if (!channels.length) return [];
        return applyFilters(channels, userOrg);
    }, [channels, userOrg, applyFilters]);

    // Apply sorting
    const sortedChannels = useMemo(() => {
        return getSortedChannels(filteredChannels, complianceResults);
    }, [filteredChannels, getSortedChannels, complianceResults]);

    // Pagination
    const {
        currentPage,
        itemsPerPage,
        paginatedItems: paginatedChannels,
        totalPages,
        setCurrentPage,
        setItemsPerPage,
        resetToFirstPage,
    } = usePagination(sortedChannels, {
        initialItemsPerPage: 8,
        storageKey: 'channels-items-per-page',
    });

    // Stable handlers for toolbar
    const handleSearchSubmit = useCallback(() => {
        resetToFirstPage();
    }, [resetToFirstPage]);

    const handleSortOptionChange = useCallback(
        (option: SortOption) => {
            handleSortMenu(option);
            resetToFirstPage();
        },
        [handleSortMenu, resetToFirstPage]
    );

    const handleFilterOptionChange = useCallback(
        (option: FilterOption) => {
            const mode = option === 'partner' ? 'subscribed' : option;
            setFilterMode(mode);
            resetToFirstPage();
        },
        [setFilterMode, resetToFirstPage]
    );

    const handleClearSearch = useCallback(() => {
        setSearch('');
        setFilterMode('all');
        resetToFirstPage();
    }, [setSearch, setFilterMode, resetToFirstPage]);

    const handleItemsPerPageChange = useCallback(
        (value: number) => {
            setItemsPerPage(value);
            resetToFirstPage();
        },
        [setItemsPerPage, resetToFirstPage]
    );

    // Stable callbacks for modal close handlers
    const handleDeleteModalClose = useCallback(() => {
        cancelDelete();
        deleteDisclosure.onClose();
    }, [cancelDelete, deleteDisclosure]);

    const handleComplianceModalClose = useCallback(() => {
        setSelectedComplianceResult(null);
        complianceDisclosure.onClose();
    }, [setSelectedComplianceResult, complianceDisclosure]);

    // Stable callbacks for ChannelTableRow - these receive channelId/channel as parameter
    const handleViewChannel = useCallback(
        (channelId: string) => {
            router.push('/channels/' + channelId);
        },
        [router]
    );

    const handleCheckCompliance = useCallback(
        async (channel: DataChannel) => {
            const result = await checkCompliance(channel);
            if (result && result.status !== 'compliant') {
                setSelectedComplianceResult(result);
                complianceDisclosure.onOpen();
            }
        },
        [checkCompliance, setSelectedComplianceResult, complianceDisclosure]
    );

    const handleDeleteChannel = useCallback(
        (channelId: string) => {
            initiateDelete(channelId);
            deleteDisclosure.onOpen();
        },
        [initiateDelete, deleteDisclosure]
    );

    return (
        <>
            {/* Delete Confirmation Modal */}
            <DeleteChannelModal
                isOpen={deleteDisclosure.isOpen}
                isDeleting={isDeleting}
                onClose={handleDeleteModalClose}
                onConfirm={confirmDelete}
            />

            {/* Compliance Results Modal */}
            <ComplianceResultModal
                isOpen={complianceDisclosure.isOpen}
                result={selectedComplianceResult}
                onClose={handleComplianceModalClose}
            />

            {/* Create Channel Modal */}
            <CreateChannelModal disclosure={createChannelDisclosure} user={user} token={token} />

            <Flex direction="column" gap={5}>
                {hasError ? (
                    <ErrorCard
                        title="Error"
                        message="An error occurred while fetching the channels. Please try again later."
                        retry={refetch}
                    />
                ) : (
                    <Flex gap={5} direction="column">
                        {/* Loading State */}
                        {isLoading || channels === null ? (
                            <Card className="flex justify-center items-center p-8">
                                <Loading data-testid="channels-loading-spinner" />
                            </Card>
                        ) : sortedChannels.length > 0 ? (
                            <Card className="p-4">
                                {/* Toolbar */}
                                <ChannelListToolbar
                                    search={search}
                                    selectedSort={sortMenuOption}
                                    selectedFilter={
                                        filterMode === 'subscribed' ? 'partner' : (filterMode as FilterOption)
                                    }
                                    onSearchChange={setSearch}
                                    onSearchSubmit={handleSearchSubmit}
                                    onSortChange={handleSortOptionChange}
                                    onFilterChange={handleFilterOptionChange}
                                    onCreateChannel={createChannelDisclosure.onOpen}
                                />

                                {/* Table */}
                                <div
                                    className="w-full mt-4"
                                    data-table-container="channels"
                                    style={{ position: 'relative' }}
                                >
                                    <DataTable size="medium" className="w-full">
                                        <DataTable.Header>
                                            <DataTable.Row>
                                                <DataTable.HeaderCell
                                                    sortable
                                                    alignment="left"
                                                    sortDirection={sortColumn === 'name' ? sortDirection : null}
                                                    onSort={() => handleSort('name')}
                                                    className="w-[196px] min-w-[196px] max-w-[196px] h-[48px] border-l border-solid gap-2 py-1 px-3 !text-primary-100"
                                                >
                                                    Data Channel
                                                </DataTable.HeaderCell>
                                                <DataTable.HeaderCell
                                                    sortable
                                                    alignment="left"
                                                    sortDirection={sortColumn === 'description' ? sortDirection : null}
                                                    onSort={() => handleSort('description')}
                                                    className="min-w-[300px] max-w-[300px] !text-primary-100"
                                                >
                                                    Description
                                                </DataTable.HeaderCell>
                                                <DataTable.HeaderCell
                                                    sortable
                                                    alignment="left"
                                                    sortDirection={
                                                        sortColumn === 'creatorOrganization' ? sortDirection : null
                                                    }
                                                    onSort={() => handleSort('creatorOrganization')}
                                                    className="min-w-[150px] !text-primary-100"
                                                >
                                                    Owned by
                                                </DataTable.HeaderCell>
                                                <DataTable.HeaderCell
                                                    sortable
                                                    alignment="left"
                                                    sortDirection={sortColumn === 'status' ? sortDirection : null}
                                                    onSort={() => handleSort('status')}
                                                    className="min-w-[120px] !text-primary-100"
                                                >
                                                    Status
                                                </DataTable.HeaderCell>
                                                <DataTable.HeaderCell
                                                    sortable
                                                    alignment="left"
                                                    sortDirection={sortColumn === 'compliance' ? sortDirection : null}
                                                    onSort={() => handleSort('compliance')}
                                                    className="min-w-[120px] !text-primary-100"
                                                >
                                                    Compliance
                                                </DataTable.HeaderCell>
                                                <DataTable.HeaderCell alignment="left" className="!text-primary-100">
                                                    {' '}
                                                </DataTable.HeaderCell>
                                            </DataTable.Row>
                                        </DataTable.Header>
                                        <DataTable.Body>
                                            {paginatedChannels.map((channel) => {
                                                const isOwned = isChannelOwned(channel);
                                                const complianceResult = complianceResults[channel.id];

                                                return (
                                                    <ChannelTableRow
                                                        key={channel.id}
                                                        channel={channel}
                                                        isOwned={isOwned}
                                                        complianceStatus={complianceResult?.status}
                                                        isCheckingCompliance={checkingCompliance[channel.id] || false}
                                                        hasComplianceResult={!!complianceResult}
                                                        canCheckCompliance={canCheckCompliance}
                                                        onView={handleViewChannel}
                                                        onCheckCompliance={handleCheckCompliance}
                                                        onDelete={handleDeleteChannel}
                                                    />
                                                );
                                            })}
                                        </DataTable.Body>
                                    </DataTable>
                                </div>

                                {/* Pagination */}
                                <ChannelsPagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={sortedChannels.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                    onItemsPerPageChange={handleItemsPerPageChange}
                                />
                            </Card>
                        ) : channels.length === 0 ? (
                            <NoChannelsState onCreateChannel={createChannelDisclosure.onOpen} />
                        ) : (
                            <ChannelNotFoundState
                                searchTerm={search.trim() || (filterMode !== 'all' ? filterMode : undefined)}
                                onClearSearch={handleClearSearch}
                            />
                        )}
                    </Flex>
                )}
            </Flex>
        </>
    );
}
