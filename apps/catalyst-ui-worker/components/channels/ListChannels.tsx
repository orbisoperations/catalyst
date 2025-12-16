'use client';
import {
    APIKeyText,
    CreateButton,
    ErrorCard,
    OpenButton,
    OrbisBadge,
    OrbisButton,
    OrbisTable,
} from '@/components/elements';
import { CreateChannelModal } from '@/components/modals';
import { DataChannel } from '@catalyst/schemas';
import { Flex } from '@chakra-ui/layout';
import {
    Card,
    CardBody,
    Select,
    Spinner,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    IconButton,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    useDisclosure,
} from '@chakra-ui/react';
import { EllipsisVerticalIcon, TrashIcon } from '@heroicons/react/20/solid';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '../contexts/User/UserContext';

type ListChannelsProps = {
    listChannels: (token: string) => Promise<DataChannel[]>;
    deleteChannel: (channelId: string, token: string) => Promise<DataChannel>;
};

export default function DataChannelListComponents({ listChannels, deleteChannel }: ListChannelsProps) {
    const router = useRouter();
    const { token, user } = useUser();

    // Modal disclosures
    const deleteDisclosure = useDisclosure();
    const createChannelDisclosure = useDisclosure();
    const { token, user } = useUser();
    function filterChannels(filterMode: 'all' | 'subscribed' | 'owned' = 'all') {
        let filteredChannels = allChannels;
        if (filterMode === 'subscribed') {
            filteredChannels = filteredChannels.filter((channel) => {
                return channel.creatorOrganization !== user?.custom.org;
            });
        }
        if (filterMode === 'owned') {
            filteredChannels = filteredChannels.filter((channel) => {
                return channel.creatorOrganization === user?.custom.org;
            });
        }
        setChannels(filteredChannels);
    }
    function fetchChannels() {
        setIsLoading(true);
        setHasError(false);
        if (token)
            listChannels(token)
                .then((data) => {
                    setIsLoading(false);
                    const response = (data as DataChannel[]).sort((a, b) => a.name.localeCompare(b.name));
                    setAllChannels(response);
                    setChannels(response);
                })
                .catch(() => {
                    setIsLoading(false);
                    setHasError(true);
                });
    }

    function handleDeleteChannel(channelId: string) {
        setChannelToDelete(channelId);
        deleteDisclosure.onOpen();
    }, [initiateDelete, deleteDisclosure]);

    return (
        <>
            <Modal isOpen={deleteDisclosure.isOpen} onClose={deleteDisclosure.onClose}>
                <ModalOverlay />
                <ModalContent data-testid="modal-confirm-delete">
                    <ModalHeader data-testid="modal-confirm-delete-title">
                        Are you sure you want to delete this channel?
                    </ModalHeader>
                    <ModalBody data-testid="modal-confirm-delete-body">
                        <Text>Deleting this channel will remove all associated data</Text>
                    </ModalBody>
                    <ModalFooter>
                        <Flex gap={5}>
                            <OrbisButton
                                data-testid="modal-cancel-button"
                                colorScheme="gray"
                                onClick={deleteDisclosure.onClose}
                            >
                                Cancel
                            </OrbisButton>
                            <OrbisButton
                                data-testid="modal-confirm-button"
                                colorScheme="red"
                                onClick={confirmDeleteChannel}
                            >
                                Delete
                            </OrbisButton>
                        </Flex>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <CreateChannelModal disclosure={createChannelDisclosure} user={user} token={token} />
            <Flex direction="column" gap={5}>
                {!hasError && (
                    <Flex gap={5} justifyContent="flex-end">
                        <CreateButton data-testid="channels-create-button" onClick={createChannelDisclosure.onOpen} />
                    </Flex>
                )}
                {hasError ? (
                    <ErrorCard
                        title="Error"
                        message="An error occurred while fetching the channels. Please try again later."
                        retry={fetchChannels}
                    />
                ) : (
                    <Flex gap={5} direction={'column'}>
                        <Card p={2}>
                            <Flex gap={5} align={'center'}>
                                <Select
                                    data-testid="channels-filter-dropdown"
                                    value={filterMode}
                                    onChange={(e) => {
                                        filterChannels(e.target.value as 'all' | 'subscribed' | 'owned');
                                        setFilterMode(e.target.value as 'all' | 'subscribed' | 'owned');
                                    }}
                                >
                                    <option defaultChecked value="all">
                                        All Channels
                                    </option>
                                    <option value="subscribed">Subscribed Channels</option>
                                    <option value="owned">My Organization Channels</option>
                                </Select>
                                <OrbisButton
                                    onClick={() => {
                                        filterChannels('all');
                                        setFilterMode('all');
                                    }}
                                >
                                    Clear Filter
                                </OrbisButton>
                            </Flex>
                        </Card>
                        {isLoading || channels === null ? (
                            <Card sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <Spinner
                                    data-testid="channels-loading-spinner"
                                    color="blue.500"
                                    sx={{ margin: '1em' }}
                                />
                            </Card>
                        ) : sortedChannels.length > 0 ? (
                            <Card className="p-4">
                                {/* Toolbar */}
                                <ChannelListToolbar
                                    search={search}
                                    selectedSort={sortMenuOption}
                                    selectedFilter={filterMode === 'subscribed' ? 'partner' : filterMode as FilterOption}
                                    onSearchChange={setSearch}
                                    onSearchSubmit={handleSearchSubmit}
                                    onSortChange={handleSortOptionChange}
                                    onFilterChange={handleFilterOptionChange}
                                    onCreateChannel={createChannelDisclosure.onOpen}
                                />

                                {/* Table */}
                                <div className="w-full mt-4" data-table-container="channels" style={{ position: 'relative' }}>
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
                                                    sortDirection={sortColumn === 'creatorOrganization' ? sortDirection : null}
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
                                                <DataTable.HeaderCell alignment="left" className="!text-primary-100"> </DataTable.HeaderCell>
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
                        ) : (
                            <Card data-testid="channels-empty-state">
                                <CardBody>No Channels Available</CardBody>
                            </Card>
                        )}
                    </Flex>
                )}
            </Flex>
        </>
    );
}
