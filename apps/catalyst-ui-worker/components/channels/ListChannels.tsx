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
import { ValidationButton } from './ValidationStatus';
import { ListView } from '@/components/layouts';
import { navigationItems } from '@/utils/nav.utils';
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
import { canUserValidateChannels } from '@/app/actions/validation';
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
    const [canValidate, setCanValidate] = useState<boolean>(false);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { token, user } = useUser();
    function filterChannels(filterMode: 'all' | 'subscribed' | 'owned' = 'all') {
        let filteredChannels = allChannels;
        if (filterMode === 'subscribed') {
            filteredChannels = filteredChannels.filter(channel => {
                return channel.creatorOrganization !== user?.custom.org;
            });
        }
        if (filterMode === 'owned') {
            filteredChannels = filteredChannels.filter(channel => {
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
                .then(data => {
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
            .catch(error => {
                console.error('Failed to delete channel:', error);
                onClose();
                setChannelToDelete(null);
                setHasError(true);
            });
    }
    useEffect(() => {
        fetchChannels();
        // Check if user has permission to validate channels
        canUserValidateChannels()
            .then(setCanValidate)
            .catch(() => setCanValidate(false));
    }, [token]);

    // TODO: Update to use the dynamic organization id
    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose}>
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
                            <OrbisButton data-testid="modal-cancel-button" colorScheme="gray" onClick={onClose}>
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
            <ListView
                //$showspinner={false ? true : undefined}
                actions={
                    <Flex gap={5}>
                        <CreateButton
                            data-testid="channels-create-button"
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
                                        data-testid="channels-filter-dropdown"
                                        value={filterMode}
                                        onChange={e => {
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
                            ) : channels.length > 0 ? (
                                <Card>
                                    <OrbisTable
                                        headers={['Data Channel', 'Description', 'Channel ID', 'Validation', '']}
                                        rows={channels.map((channel, index) => {
                                            return [
                                                <Flex
                                                    key={'1'}
                                                    data-testid={`channels-row-${channel.id}`}
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
                                                            <OrbisBadge
                                                                data-testid={`channels-row-${channel.id}-badge`}
                                                            >
                                                                Published
                                                            </OrbisBadge>
                                                        ) : (
                                                            <OrbisBadge
                                                                data-testid={`channels-row-${channel.id}-badge`}
                                                                colorScheme="red"
                                                            >
                                                                Disabled
                                                            </OrbisBadge>
                                                        )
                                                    ) : (
                                                        <OrbisBadge
                                                            data-testid={`channels-row-${channel.id}-badge`}
                                                            colorScheme="green"
                                                        >
                                                            Subscribed
                                                        </OrbisBadge>
                                                    )}
                                                </Flex>,
                                                channel.description,
                                                <APIKeyText allowCopy showAsClearText key={index + '-channel-id'}>
                                                    {channel.id}
                                                </APIKeyText>,
                                                // Only show validation button if:
                                                // 1. User has data custodian permissions (canValidate)
                                                // 2. Channel belongs to user's organization
                                                canValidate && channel.creatorOrganization === user?.custom.org ? (
                                                    <ValidationButton
                                                        key={index + '-validation'}
                                                        data-testid={`channels-row-${channel.id}-validate-button`}
                                                        channelId={channel.id}
                                                        endpoint={channel.endpoint}
                                                        organizationId={channel.creatorOrganization}
                                                    />
                                                ) : (
                                                    <div key={index + '-validation'} />
                                                ),
                                                <Menu key={index + '-menu'}>
                                                    <MenuButton
                                                        as={IconButton}
                                                        data-testid={`channels-row-${channel.id}-menu-button`}
                                                        icon={<EllipsisVerticalIcon width={16} height={16} />}
                                                        variant="ghost"
                                                        size="sm"
                                                        aria-label="Channel options"
                                                    />
                                                    <MenuList>
                                                        {channel.creatorOrganization === user?.custom.org ? (
                                                            <MenuItem
                                                                data-testid={`channels-row-${channel.id}-delete-button`}
                                                                icon={<TrashIcon width={16} height={16} />}
                                                                color="red.500"
                                                                onClick={() => handleDeleteChannel(channel.id)}
                                                            >
                                                                Delete Channel
                                                            </MenuItem>
                                                        ) : (
                                                            <MenuItem isDisabled>No actions available</MenuItem>
                                                        )}
                                                    </MenuList>
                                                </Menu>,
                                            ];
                                        })}
                                    />
                                </Card>
                            ) : (
                                <Card data-testid="channels-empty-state">
                                    <CardBody>No Channels Available</CardBody>
                                </Card>
                            )}
                        </Flex>
                    )
                }
                topbartitle="Data Channels"
            />
        </>
    );
}
