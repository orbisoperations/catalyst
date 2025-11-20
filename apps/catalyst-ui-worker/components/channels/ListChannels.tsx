'use client';
import { ComplianceResult, DataChannel } from '@catalyst/schemas';
import { Flex } from '@chakra-ui/layout';
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    ModalCloseButton,
    Text,
    useDisclosure,
    Spinner,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Input,
    Grid,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Box,
} from '@chakra-ui/react';
import {
    ErrorCard,
    OrbisButton,
} from '@/components/elements';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '../contexts/User/UserContext';
import { canUserCheckCompliance, checkCompliance } from '@/app/actions/compliance';
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
import { DetailedComplianceResult } from './DetailedComplianceResult';
import { ComplianceStatusBadge } from './ComplianceStatus';
import { CheckCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline';

type ListChannelsProps = {
    listChannels: (token: string) => Promise<DataChannel[]>;
    deleteChannel: (channelId: string, token: string) => Promise<DataChannel>;
    createDataChannel: (formData: FormData, token: string) => Promise<{ success: boolean; data?: DataChannel; error?: string }>;
};

export default function DataChannelListComponents({ listChannels, deleteChannel, createDataChannel }: ListChannelsProps) {
    const router = useRouter();
    const [channels, setChannels] = useState<DataChannel[] | null>(null);
    const [allChannels, setAllChannels] = useState<DataChannel[]>([]);
    const [hasError, setHasError] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [filterMode, setFilterMode] = useState<'all' | 'operational' | 'disabled' | 'owned' | 'partner'>('all');
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
    const {
        isOpen: isCreateModalOpen,
        onOpen: onCreateModalOpen,
        onClose: onCreateModalClose,
    } = useDisclosure();
    const { token, user } = useUser();
    const [newChannel, setNewChannel] = useState<Omit<DataChannel, 'id'>>({
        name: '',
        description: '',
        endpoint: '',
        creatorOrganization: String(user?.custom.org || ''),
        accessSwitch: true,
    });
    const [nameError, setNameError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [search, setSearch] = useState<string>('');
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const filterChannels = useCallback(
        (filterMode: 'all' | 'operational' | 'disabled' | 'owned' | 'partner' = 'all', searchTerm: string = '') => {
            let filteredChannels = allChannels;

            // Apply filter mode
            if (filterMode === 'operational') {
                filteredChannels = filteredChannels.filter((channel) => {
                    return channel.accessSwitch === true;
                });
            }
            if (filterMode === 'disabled') {
                filteredChannels = filteredChannels.filter((channel) => {
                    return channel.accessSwitch === false;
                });
            }
            if (filterMode === 'owned') {
                filteredChannels = filteredChannels.filter((channel) => {
                    return channel.creatorOrganization === user?.custom.org;
                });
            }
            if (filterMode === 'partner') {
                filteredChannels = filteredChannels.filter((channel) => {
                    return channel.creatorOrganization !== user?.custom.org;
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

    function handleFilterMenu(filterType: 'all' | 'operational' | 'disabled' | 'owned' | 'partner') {
        setFilterMode(filterType);
    }

    function handleSort(column: string) {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    }

    function handleSortMenu(sortType: 'a-z' | 'z-a' | 'status' | 'compliance') {
        switch (sortType) {
            case 'a-z':
                setSortColumn('name');
                setSortDirection('asc');
                break;
            case 'z-a':
                setSortColumn('name');
                setSortDirection('desc');
                break;
            case 'status':
                setSortColumn('status');
                setSortDirection('asc');
                break;
            case 'compliance':
                setSortColumn('compliance');
                setSortDirection('asc');
                break;
        }
    }

    function getComplianceStatus(channel: DataChannel): string {
        if (!channel.lastComplianceResult) {
            return 'unknown';
        }
        return channel.lastComplianceResult.status || 'unknown';
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
                case 'compliance':
                    const complianceA = getComplianceStatus(a);
                    const complianceB = getComplianceStatus(b);
                    comparison = complianceA.localeCompare(complianceB);
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

    useEffect(() => {
        if (user?.custom.org) {
            setNewChannel((prev) => ({
                ...prev,
                creatorOrganization: String(user.custom.org),
            }));
        }
    }, [user?.custom.org]);

    function handleCreateChannel(formData: FormData) {
        setIsSubmitting(true);
        setNameError('');
        formData.set('organization', String(user?.custom.org));

        if (!token) {
            setNameError('Authentication required');
            setIsSubmitting(false);
            return;
        }

        createDataChannel(formData, token)
            .then((result) => {
                if (result.success && result.data) {
                    onCreateModalClose();
                    setNewChannel({
                        name: '',
                        description: '',
                        endpoint: '',
                        creatorOrganization: String(user?.custom.org || ''),
                        accessSwitch: true,
                    });
                    fetchChannels();
                } else {
                    const isValidationError =
                        result.error?.includes('already exists in your organization') ||
                        result.error?.includes('Invalid data channel') ||
                        result.error?.includes('Channel name') ||
                        result.error?.includes('cannot be only whitespace') ||
                        result.error?.includes('Only letters, numbers, and standard symbols') ||
                        result.error?.includes('cannot contain HTML') ||
                        result.error?.includes('cannot contain script') ||
                        result.error?.includes('contains potentially dangerous') ||
                        result.error?.includes('is required') ||
                        result.error?.includes('must be') ||
                        result.error?.includes('characters or less') ||
                        result.error?.includes('invalid characters');
                    if (isValidationError) {
                        setNameError(result.error || 'Validation error');
                    } else {
                        setHasError(true);
                    }
                }
            })
            .catch((e) => {
                console.error('Unexpected error:', e);
                setHasError(true);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    }

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
    if (isLoading || channels === null) {
        return (
            <Flex justify="center" align="center" minH="400px">
                <Spinner size="xl" />
            </Flex>
        );
    }

    return (
        <>
            {hasError ? (
                <ErrorCard
                    title="Error"
                    message="An error occurred while fetching the channels. Please try again later."
                    retry={fetchChannels}
                />
            ) : (
                <Flex gap={5} direction={'column'}>
                    <Card className="p-4">
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
                                <Menu placement="bottom-start">
                                    <MenuButton
                                        as={Box}
                                        display="inline-block"
                                        cursor="pointer"
                                    >
                                        <TertiaryIconButton>
                                            <ArrowDownWideNarrowIcon size={16} />
                                        </TertiaryIconButton>
                                    </MenuButton>
                                    <MenuList>
                                        <MenuItem onClick={() => handleSortMenu('a-z')}>
                                            A-Z
                                        </MenuItem>
                                        <MenuItem onClick={() => handleSortMenu('z-a')}>
                                            Z-A
                                        </MenuItem>
                                        <MenuItem onClick={() => handleSortMenu('status')}>
                                            Status
                                        </MenuItem>
                                        <MenuItem onClick={() => handleSortMenu('compliance')}>
                                            Compliance
                                        </MenuItem>
                                    </MenuList>
                                </Menu>
                                <Menu placement="bottom-start">
                                    <MenuButton
                                        as={Box}
                                        display="inline-block"
                                        cursor="pointer"
                                    >
                                        <TertiaryIconButton>
                                            <FunnelIcon size={16} />
                                        </TertiaryIconButton>
                                    </MenuButton>
                                    <MenuList>
                                        <MenuItem onClick={() => handleFilterMenu('all')}>
                                            All
                                        </MenuItem>
                                        <MenuItem onClick={() => handleFilterMenu('operational')}>
                                            Operational
                                        </MenuItem>
                                        <MenuItem onClick={() => handleFilterMenu('disabled')}>
                                            Disabled
                                        </MenuItem>
                                        <MenuItem onClick={() => handleFilterMenu('owned')}>
                                            Owned by organization
                                        </MenuItem>
                                        <MenuItem onClick={() => handleFilterMenu('partner')}>
                                            Owned by partner
                                        </MenuItem>
                                    </MenuList>
                                </Menu>
                                <PrimaryButton
                                    showIcon
                                    icon={<PlusIcon size={16} />}
                                    onClick={onCreateModalOpen}
                                >
                                    Create
                                </PrimaryButton>
                            </Flex>
                        </Flex>
                        <div className="w-full mt-4" data-table-container style={{ position: 'relative' }}>
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
                                                    <div 
                                                        className="truncate cursor-pointer" 
                                                        title={channel.name}
                                                        onClick={() => router.push(`/channels/${channel.id}`)}
                                                    >
                                                        {channel.name}
                                                    </div>
                                                </DataTable.Cell>
                                                <DataTable.Cell
                                                    alignment="left"
                                                    className="min-w-[300px] max-w-[300px]"
                                                >
                                                    <div
                                                        className="truncate cursor-pointer"
                                                        title={channel.description || '-'}
                                                        onClick={() => router.push(`/channels/${channel.id}`)}
                                                    >
                                                        {channel.description || '-'}
                                                    </div>
                                                </DataTable.Cell>
                                                <DataTable.Cell 
                                                    alignment="left" 
                                                    className="min-w-[150px]"
                                                >
                                                    <div 
                                                        className="cursor-pointer"
                                                        onClick={() => router.push(`/channels/${channel.id}`)}
                                                    >
                                                        {channel.creatorOrganization === user?.custom.org ? (
                                                            <>
                                                                {channel.creatorOrganization}
                                                                {' (you)'}
                                                            </>
                                                        ) : (
                                                            <Link 
                                                                href={`/partners/${channel.creatorOrganization}`}
                                                                style={{
                                                                    color: '#3182ce',
                                                                    textDecoration: 'none',
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                }}
                                                            >
                                                                {channel.creatorOrganization}
                                                            </Link>
                                                        )}
                                                    </div>
                                                </DataTable.Cell>
                                                <DataTable.Cell alignment="left">
                                                    <div 
                                                        className="cursor-pointer"
                                                        onClick={() => router.push(`/channels/${channel.id}`)}
                                                    >
                                                        {channel.accessSwitch ? (
                                                            <Badges style="positive">
                                                                <Flex alignItems="center" gap={1.5}>
                                                                    <CheckCircleIcon width={16} height={16} />
                                                                    Operational
                                                                </Flex>
                                                            </Badges>
                                                        ) : (
                                                            <Badges style="default">
                                                                <Flex alignItems="center" gap={1.5}>
                                                                    <MinusCircleIcon width={16} height={16} />
                                                                    Disabled
                                                                </Flex>
                                                            </Badges>
                                                        )}
                                                    </div>
                                                </DataTable.Cell>
                                                <DataTable.Cell alignment="center">
                                                    <div 
                                                        className="cursor-pointer"
                                                        onClick={() => router.push(`/channels/${channel.id}`)}
                                                    >
                                                        <ComplianceStatusBadge status={channel.lastComplianceResult?.status} />
                                                    </div>
                                                </DataTable.Cell>
                                            </DataTable.Row>
                                        ))
                                        : null}
                                </DataTable.Body>
                            </DataTable>
                            {channels && channels.length === 0 && renderNoData(search.trim() !== '')}
                        </div>
                        {!isLoading && channels !== null && (
                            <div className="space-y-4 mt-4">
                                <Pagination
                                    itemsPerPage={10}
                                    onItemsPerPageChange={function Xs() { }}
                                    onPageChange={function Xs() { }}
                                    selected={1}
                                    showMoreLeft
                                    showMoreRight
                                    showResultCount
                                    showSelectCount
                                    totalResults={channels.length}
                                />
                            </div>
                        )}
                    </Card>
                </Flex>
            )}
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
            <Modal isOpen={isCreateModalOpen} onClose={onCreateModalClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        <Text>Create Data Channel</Text>
                        <Text fontSize="sm" color="gray.600" fontWeight="normal" mt={2}>
                            It can be shared with selected partners when needed.
                        </Text>
                    </ModalHeader>
                    <ModalCloseButton />
                    <form
                        action={async (formData) => {
                            handleCreateChannel(formData);
                        }}
                    >
                        <ModalBody pb={6}>
                            <Grid gap={5}>
                                <FormControl display={'grid'} gap={2} isInvalid={!!nameError}>
                                    <FormLabel htmlFor="name">Channel Name</FormLabel>
                                    <Input
                                        rounded="md"
                                        value={newChannel.name}
                                        onChange={(e) => {
                                            setNewChannel({
                                                ...newChannel,
                                                name: e.target.value,
                                            });
                                        }}
                                        name="name"
                                        required={true}
                                        placeholder="Data Channel Name"
                                        maxLength={64}
                                        isDisabled={isSubmitting}
                                    />
                                    {nameError && <FormErrorMessage>{nameError}</FormErrorMessage>}
                                </FormControl>
                                <FormControl display={'grid'} gap={2}>
                                    <FormLabel htmlFor="description">Channel Description</FormLabel>
                                    <Input
                                        rounded="md"
                                        value={newChannel.description}
                                        onChange={(e) => {
                                            setNewChannel({
                                                ...newChannel,
                                                description: e.target.value,
                                            });
                                        }}
                                        name="description"
                                        required={true}
                                        placeholder="Description"
                                        isDisabled={isSubmitting}
                                    />
                                </FormControl>
                                <FormControl display={'grid'} gap={2}>
                                    <FormLabel htmlFor="endpoint">Endpoint / URL</FormLabel>
                                    <Input
                                        rounded="md"
                                        name="endpoint"
                                        value={newChannel.endpoint}
                                        onChange={(e) => {
                                            setNewChannel({
                                                ...newChannel,
                                                endpoint: e.target.value,
                                            });
                                        }}
                                        required={true}
                                        placeholder="Endpoint URL"
                                        isDisabled={isSubmitting}
                                    />
                                </FormControl>
                            </Grid>
                        </ModalBody>
                        <ModalFooter>
                            <Flex justifyContent={'space-between'} width="100%">
                                <OrbisButton
                                    colorScheme="gray"
                                    onClick={() => {
                                        onCreateModalClose();
                                        setNewChannel({
                                            name: '',
                                            description: '',
                                            endpoint: '',
                                            creatorOrganization: String(user?.custom.org || ''),
                                            accessSwitch: true,
                                        });
                                        setNameError('');
                                    }}
                                    isDisabled={isSubmitting}
                                >
                                    Cancel
                                </OrbisButton>
                                <OrbisButton type="submit" isLoading={isSubmitting} loadingText="Creating...">
                                    Create
                                </OrbisButton>
                            </Flex>
                        </ModalFooter>
                    </form>
                </ModalContent>
            </Modal>
        </>
    );
}
