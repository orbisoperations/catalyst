'use client';
import { ErrorCard, OrbisButton } from '@/components/elements';
import { ListView } from '@/components/layouts';
import { navigationItems } from '@/utils/nav.utils';
import { DataChannel } from '@catalyst/schemas';
import { Flex } from '@chakra-ui/layout';
import {
    // Spinner,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    ModalCloseButton,
    Text,
    useDisclosure,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '../contexts/User/UserContext';
import { canUserCheckCompliance } from '@/app/actions/compliance';
import {
    PrimaryButton,
    Card,
    TextInputAndButton,
    TertiaryIconButton,
    DataTable,
    Pagination,
    Badges,
} from '@orbisoperations/o2-ui';
import { SearchIcon, PlusIcon, ArrowDownWideNarrowIcon, FunnelIcon } from 'lucide-react';


type ListChannelsProps = {
    listChannels: (token: string) => Promise<DataChannel[]>;
    deleteChannel: (channelId: string, token: string) => Promise<DataChannel>;
};

export default function DataChannelListComponents({ listChannels, deleteChannel }: ListChannelsProps) {
    const router = useRouter();
    const [channels, setChannels] = useState<DataChannel[] | null>(null);
    const [allChannels, setAllChannels] = useState<DataChannel[]>([]);
    const [hasError, setHasError] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [filterMode, setFilterMode] = useState<'all' | 'subscribed' | 'owned'>('all');
    const [channelToDelete, setChannelToDelete] = useState<string | null>(null);
    const [canCheckCompliance, setCanCheckCompliance] = useState<boolean>(false);
    const [isCheckingCompliance, setIsCheckingCompliance] = useState<string | null>(null);
    const [selectedComplianceResult, setSelectedComplianceResult] = useState<ComplianceResult | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const {
        isOpen: isComplianceModalOpen,
        onOpen: onComplianceModalOpen,
        onClose: onComplianceModalClose,
    } = useDisclosure();
    const { token, user } = useUser();
    const [search, setSearch] = useState<string>('');
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const filterChannels = useCallback(
        (filterMode: 'all' | 'subscribed' | 'owned' = 'all', searchTerm: string = '') => {
            let filteredChannels = allChannels;

            // Apply filter mode
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

            // Apply search filter
            if (searchTerm.trim()) {
                filteredChannels = filteredChannels.filter((channel) => {
                    return (
                        channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        channel.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        channel.id.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                });
            }

            setChannels(filteredChannels);
        },
        [allChannels, user?.custom.org]
    );

    function handleSort(column: string) {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    }

    function getSortedChannels(channelsToSort: DataChannel[]) {
        if (!sortColumn) return channelsToSort;

        const sorted = [...channelsToSort].sort((a, b) => {
            let comparison = 0;
            switch (sortColumn) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'description':
                    comparison = (a.description || '').localeCompare(b.description || '');
                    break;
                case 'organization':
                    comparison = a.creatorOrganization.localeCompare(b.creatorOrganization);
                    break;
                case 'status':
                    const statusA = getChannelStatus(a);
                    const statusB = getChannelStatus(b);
                    comparison = statusA.localeCompare(statusB);
                    break;
                default:
                    return 0;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return sorted;
    }

    function getChannelStatus(channel: DataChannel): string {
        if (channel.creatorOrganization === user?.custom.org) {
            return channel.accessSwitch ? 'Published' : 'Disabled';
        }
        return 'Subscribed';
    }

    // Update channels when search or filter changes
    useEffect(() => {
        if (allChannels.length > 0) {
            filterChannels(filterMode, search);
        }
    }, [search, filterMode, filterChannels]);
    function fetchChannels() {
        setIsLoading(true);
        setHasError(false);
        if (token)
            listChannels(token)
                .then((data) => {
                    setIsLoading(false);
                    const response = (data as DataChannel[]).sort((a, b) => a.name.localeCompare(b.name));
                    setAllChannels(response);
                    console.log(response);
                    setChannels(response);
                })
                .catch(() => {
                    setIsLoading(false);
                    setHasError(true);
                });
    }

    function handleDeleteChannel(channelId: string) {
        setChannelToDelete(channelId);
        onOpen();
    }

    function confirmDeleteChannel() {
        if (!token || !channelToDelete) return;

        deleteChannel(channelToDelete, token)
            .then(() => {
                onClose();
                setChannelToDelete(null);
                fetchChannels();
            })
            .catch((error) => {
                console.error('Failed to delete channel:', error);
                onClose();
                setChannelToDelete(null);
                setHasError(true);
            });
    }

    async function handleRetryCompliance(channel: DataChannel) {
        setIsCheckingCompliance(channel.id);
        try {
            const result = await checkCompliance(channel.id, channel.endpoint, channel.creatorOrganization);
            // Refresh the channels list to show the updated compliance result
            fetchChannels();

            // Show the results if not compliant
            if (result.status !== 'compliant') {
                setSelectedComplianceResult(result);
                onComplianceModalOpen();
            }
        } catch (error) {
            console.error('Compliance check error:', error);
        } finally {
            setIsCheckingCompliance(null);
        }
    }

    function handleViewComplianceResults(channel: DataChannel) {
        if (channel.lastComplianceResult) {
            setSelectedComplianceResult(channel.lastComplianceResult);
            onComplianceModalOpen();
        }
    }
    useEffect(() => {
        fetchChannels();
        // Check if user has permission to check channel compliance
        canUserCheckCompliance()
            .then(setCanCheckCompliance)
            .catch(() => setCanCheckCompliance(false));
    }, [token]);

    function renderNoData(hasFilter: boolean) {
        return (
            <div className="flex items-center justify-center py-16 min-h-[400px] flex-col gap-6">
                {hasFilter ? <SearchIcon size={48} /> : <PlusIcon size={48} />}
                <div className="flex flex-col items-center justify-center gap-3">
                    <Text className="text-center text-2xl font-medium">
                        {hasFilter ? 'Data channel not found' : 'No data channels'}
                    </Text>
                    <Text className="text-center text-sm">
                        {hasFilter
                            ? `Your search for "${search}" did not return any results`
                            : 'Create your first data channel or gain partners to start using Catalyst.'}
                    </Text>
                </div>
                {hasFilter ? (
                    <PrimaryButton onClick={() => setSearch('')}>Clear Search</PrimaryButton>
                ) : (
                    <PrimaryButton
                        onClick={() => {
                            router.push('/channels/create');
                        }}
                    >
                        Create Data Channel
                    </PrimaryButton>
                )}
            </div>
        );
    }

    // TODO: Update to use the dynamic organization id
    return (
        <>
            <ListView
                showspinner={isLoading || channels === null}
                topbaractions={navigationItems}
                positionChildren="bottom"
                table={
                    hasError ? (
                        <ErrorCard
                            title="Error"
                            message="An error occurred while fetching the channels. Please try again later."
                            retry={fetchChannels}
                        />
                    ) : (
                        <Flex gap={5} direction={'column'}>
                            <Card className="p-4">
                                <Flex gap={5} direction={'column'}>
                                    <Flex className="border-none" justify={'space-between'} align={'center'}>
                                        <div className="w-[336px]">
                                            <TextInputAndButton
                                                value={search}
                                                onChange={setSearch}
                                                size={'medium'}
                                                state={'default'}
                                            >
                                                <TextInputAndButton.Container>
                                                    <TextInputAndButton.Input placeholder={'Search by name'} />
                                                    <TextInputAndButton.Button
                                                        onClick={() => filterChannels(filterMode, search)}
                                                        aria-label="Search"
                                                    >
                                                        <SearchIcon size={16} />
                                                    </TextInputAndButton.Button>
                                                </TextInputAndButton.Container>
                                            </TextInputAndButton>
                                        </div>
                                        <Flex gap={3}>
                                            <TertiaryIconButton>
                                                <ArrowDownWideNarrowIcon size={16} />
                                            </TertiaryIconButton>
                                            <TertiaryIconButton>
                                                <FunnelIcon size={16} />
                                            </TertiaryIconButton>
                                            <PrimaryButton
                                                showIcon
                                                icon={<PlusIcon size={16} />}
                                                onClick={() => router.push('/channels/create')}
                                            >
                                                Create
                                            </PrimaryButton>
                                        </Flex>
                                    </Flex>
                                </Flex>
                            </Card>
                            <Card>
                                <div className="w-full overflow-x-auto">
                                    <DataTable size="medium" interactive={true} className="w-full">
                                        <DataTable.Header>
                                            <DataTable.Row>
                                                <DataTable.HeaderCell
                                                    sortable
                                                    sortDirection={sortColumn === 'name' ? sortDirection : null}
                                                    onSort={() => handleSort('name')}
                                                    className="min-w-[200px] max-w-[200px]"
                                                >
                                                    Data channel
                                                </DataTable.HeaderCell>
                                                <DataTable.HeaderCell
                                                    sortable
                                                    sortDirection={sortColumn === 'description' ? sortDirection : null}
                                                    onSort={() => handleSort('description')}
                                                    className="min-w-[300px] max-w-[300px]"
                                                >
                                                    Description
                                                </DataTable.HeaderCell>
                                                <DataTable.HeaderCell
                                                    sortable
                                                    sortDirection={sortColumn === 'organization' ? sortDirection : null}
                                                    onSort={() => handleSort('organization')}
                                                    className="min-w-[150px]"
                                                >
                                                    Owned by
                                                </DataTable.HeaderCell>
                                                <DataTable.HeaderCell
                                                    sortable
                                                    sortDirection={sortColumn === 'status' ? sortDirection : null}
                                                    onSort={() => handleSort('status')}
                                                    className="min-w-[120px]"
                                                >
                                                    Status
                                                </DataTable.HeaderCell>
                                                <DataTable.HeaderCell alignment="center" className="min-w-[120px]">
                                                    Compliance
                                                </DataTable.HeaderCell>
                                            </DataTable.Row>
                                        </DataTable.Header>
                                        <DataTable.Body>
                                            {channels && channels.length > 0
                                                ? getSortedChannels(channels).map((channel) => (
                                                      <DataTable.Row key={channel.id}>
                                                          <DataTable.Cell
                                                              alignment="left"
                                                              className="min-w-[200px] max-w-[200px]"
                                                          >
                                                              <div className="truncate" title={channel.name}>
                                                                  {channel.name}
                                                              </div>
                                                          </DataTable.Cell>
                                                          <DataTable.Cell
                                                              alignment="left"
                                                              className="min-w-[300px] max-w-[300px]"
                                                          >
                                                              <div
                                                                  className="truncate"
                                                                  title={channel.description || '-'}
                                                              >
                                                                  {channel.description || '-'}
                                                              </div>
                                                          </DataTable.Cell>
                                                          <DataTable.Cell alignment="left" className="min-w-[150px]">
                                                              {channel.creatorOrganization}
                                                              {channel.creatorOrganization === user?.custom.org &&
                                                                  ' (you)'}
                                                          </DataTable.Cell>
                                                          <DataTable.Cell alignment="left">
                                                              {channel.accessSwitch ? (
                                                                  <Badges style="positive">Operational</Badges>
                                                              ) : (
                                                                  <Badges style="default">Disabled</Badges>
                                                              )}
                                                          </DataTable.Cell>
                                                          <DataTable.Cell alignment="center">-</DataTable.Cell>
                                                      </DataTable.Row>
                                                  ))
                                                : null}
                                        </DataTable.Body>
                                    </DataTable>
                                    {channels && channels.length === 0 && renderNoData(search.trim() !== '')}
                                </div>
                            </Card>
                        </Flex>
                    )
                }
                topbartitle="Data Channels"
            >
                {!isLoading && channels !== null && (
                    <div className="p-4 space-y-4">
                        <Pagination
                            itemsPerPage={10}
                            onItemsPerPageChange={function Xs() {}}
                            onPageChange={function Xs() {}}
                            selected={1}
                            showMoreLeft
                            showMoreRight
                            showResultCount
                            showSelectCount
                            totalResults={channels.length}
                        />
                    </div>
                )}
            </ListView>
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Are you sure you want to delete this channel?</ModalHeader>
                    <ModalBody>
                        <Text>Deleting this channel will remove all associated data</Text>
                    </ModalBody>
                    <ModalFooter>
                        <Flex gap={5}>
                            <OrbisButton colorScheme="gray" onClick={onClose}>
                                Cancel
                            </OrbisButton>
                            <OrbisButton colorScheme="red" onClick={confirmDeleteChannel}>
                                Delete
                            </OrbisButton>
                        </Flex>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <Modal isOpen={isComplianceModalOpen} onClose={onComplianceModalClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Compliance Results</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        {selectedComplianceResult && <DetailedComplianceResult result={selectedComplianceResult} />}
                    </ModalBody>
                </ModalContent>
            </Modal>
            <ListView
                //$showspinner={false ? true : undefined}
                actions={
                    <Flex gap={5}>
                        <CreateButton
                            onClick={() => {
                                router.push('/channels/create');
                            }}
                        />
                    </Flex>
                }
                topbaractions={navigationItems}
                headerTitle={{
                    text: 'Data Channels',
                }}
                positionChildren="bottom"
                subtitle="All your data channels in one place."
                table={
                    hasError ? (
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
                                    <Spinner color="blue.500" sx={{ margin: '1em' }} />
                                </Card>
                            ) : channels.length > 0 ? (
                                <Card>
                                    <OrbisTable
                                        headers={['Data Channel', 'Description', 'Channel ID', 'Compliance', '']}
                                        rows={channels.map((channel, index) => {
                                            return [
                                                <Flex
                                                    key={'1'}
                                                    justifyContent={'space-between'}
                                                    alignItems={'center'}
                                                    gap={2}
                                                    justifyItems={'center'}
                                                >
                                                    <OpenButton onClick={() => router.push('/channels/' + channel.id)}>
                                                        {channel.name}
                                                    </OpenButton>
                                                    {channel.creatorOrganization === user?.custom.org ? (
                                                        channel.accessSwitch ? (
                                                            <OrbisBadge>Published</OrbisBadge>
                                                        ) : (
                                                            <OrbisBadge colorScheme="red">Disabled</OrbisBadge>
                                                        )
                                                    ) : (
                                                        <OrbisBadge colorScheme="green">Subscribed</OrbisBadge>
                                                    )}
                                                </Flex>,
                                                channel.description,
                                                <APIKeyText allowCopy showAsClearText key={index + '-channel-id'}>
                                                    {channel.id}
                                                </APIKeyText>,
                                                // Only show compliance badge if:
                                                // 1. User has data custodian permissions (canCheckCompliance)
                                                // 2. Channel belongs to user's organization
                                                canCheckCompliance &&
                                                channel.creatorOrganization === user?.custom.org ? (
                                                    <div key={index + '-compliance'}>
                                                        <ComplianceStatusBadge
                                                            status={channel.lastComplianceResult?.status}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div key={index + '-compliance'} />
                                                ),
                                                <Menu key={index + '-menu'}>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<EllipsisVerticalIcon width={16} height={16} />}
                                                        variant="ghost"
                                                        size="sm"
                                                        aria-label="Channel options"
                                                    />
                                                    <MenuList>
                                                        <MenuItem
                                                            onClick={() => router.push('/channels/' + channel.id)}
                                                        >
                                                            View Channel
                                                        </MenuItem>
                                                        {canCheckCompliance &&
                                                            channel.creatorOrganization === user?.custom.org && (
                                                                <>
                                                                    <MenuItem
                                                                        onClick={() => handleRetryCompliance(channel)}
                                                                        isDisabled={isCheckingCompliance === channel.id}
                                                                    >
                                                                        {isCheckingCompliance === channel.id
                                                                            ? 'Checking...'
                                                                            : 'Retry Compliance Check'}
                                                                    </MenuItem>
                                                                    {channel.lastComplianceResult && (
                                                                        <MenuItem
                                                                            onClick={() =>
                                                                                handleViewComplianceResults(channel)
                                                                            }
                                                                        >
                                                                            View Last Compliance Results
                                                                        </MenuItem>
                                                                    )}
                                                                </>
                                                            )}
                                                        {channel.creatorOrganization === user?.custom.org && (
                                                            <MenuItem
                                                                icon={<TrashIcon width={16} height={16} />}
                                                                color="red.500"
                                                                onClick={() => handleDeleteChannel(channel.id)}
                                                            >
                                                                Delete Channel
                                                            </MenuItem>
                                                        )}
                                                    </MenuList>
                                                </Menu>,                                                                                                                                             
                                            ];
                                        })}
                                    />
                                </Card>
                            ) : (
                                <Card>
                                    <CardBody>No Channels Available</CardBody>
                                </Card>
                            )}
                        </Flex>
                    )
                }
                topbartitle="Data Channels"
            /> */}
        </>
    );
}
