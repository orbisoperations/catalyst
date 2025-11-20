'use client';
import { ErrorCard, OrbisButton } from '@/components/elements';
import { Box, Flex, Grid, Text, IconButton } from '@chakra-ui/react';
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    useDisclosure,
    Switch,
    Select,
} from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DataChannel, DataChannelActionResponse } from '@catalyst/schemas';
import { useUser } from '../contexts/User/UserContext';
import {
    PrimaryButton,
    Card,
    TextInputAndButton,
    DataTable,
    Badges,
    Pagination,
} from '@orbisoperations/o2-ui';
import { PlusIcon, DocumentDuplicateIcon, ArrowPathIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { SearchIcon } from 'lucide-react';
import Link from 'next/link';

type DataChannelDetailsProps = {
    channelDetails: (id: string, token: string) => Promise<DataChannel>;
    updateChannel: (data: FormData, token: string) => Promise<DataChannelActionResponse>;
    deleteChannel: (id: string, token: string) => Promise<DataChannel>;
    handleSwitch: (channelId: string, accessSwitch: boolean, token: string) => Promise<DataChannel>;
};

// Mock data for partners
const mockPartners = [
    {
        id: '1',
        name: 'Zenith Dynamics',
        description: 'Provides cutting-edge defense technology solutions for modern security challenges.',
        sharing: false,
    },
    {
        id: '2',
        name: 'Global Solutions LLC',
        description: 'Offers comprehensive security solutions, training, and support services worldwide.',
        sharing: true,
    },
    {
        id: '3',
        name: 'Apex Innovations',
        description: 'Develops innovative surveillance and reconnaissance systems for tactical operations.',
        sharing: true,
    },
    {
        id: '4',
        name: 'Strategic Analytics',
        description: 'Delivers specialized training and support services for tactical technology deployments.',
        sharing: false,
    },
    {
        id: '5',
        name: 'Pinnacle Ventures',
        description: 'Manufactures high-performance tactical equipment and communication systems.',
        sharing: true,
    },
];

export default function DataChannelDetailsComponent({
    channelDetails,
    updateChannel,
    deleteChannel,
    handleSwitch,
}: DataChannelDetailsProps) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const editDisclosure = useDisclosure();
    const router = useRouter();
    const [gatewayUrl, setGatewayUrl] = useState<string>('https://gateway.catalyst.intelops.io/graphql');
    const { user, token } = useUser();
    const { id } = useParams();
    const [channel, setChannel] = useState<DataChannel>();
    const [hasError, setHasError] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [partners, setPartners] = useState(mockPartners);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 5;

    function fetchChannelDetails() {
        setHasError(false);
        if (id && typeof id === 'string' && token)
            channelDetails(id, token)
                .then((data) => {
                    setChannel(data);
                })
                .catch((e) => {
                    setHasError(true);
                    setErrorMessage('An error occurred while fetching the channel details. Does the channel exist?');
                    console.error(e);
                });
    }

    useEffect(() => {
        if (typeof window !== 'undefined' && window?.location.origin) {
            const url = window.location.origin.includes('catalyst')
                ? window.location.origin
                : 'https://catalyst.devintelops.io';
            setGatewayUrl(url.replace('catalyst', 'gateway') + '/graphql');
        }
    }, []);
    useEffect(fetchChannelDetails, [token]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    };

    const filteredPartners = partners.filter((partner) =>
        partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedPartners = filteredPartners.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(filteredPartners.length / itemsPerPage);

    if (!channel && !hasError) {
        return (
            <Flex justify="center" align="center" minH="400px">
                <Text>Loading...</Text>
            </Flex>
        );
    }

    // Use channel data if available, otherwise use mock data
    const channelName = channel?.name || 'Tactical Tech Operations';
    const channelDescription = channel?.description || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.';
    const channelEndpoint = channel?.endpoint || 'https://supersecretapi.com/private/api/v1/data';
    const channelStatus = channel?.accessSwitch ? 'Operational' : 'Disabled';
    const complianceStatus = channel?.lastComplianceResult?.status === 'compliant' ? 'Compliant' : 'Non-Compliant';
    // Mock dates for now - DataChannel schema doesn't include timestamps
    const createdDate = formatDate('2024-02-02');
    const updatedDate = formatDate('2024-02-06');

    return (
        <>
            <Flex direction="column" gap={6}>
                {hasError ? (
                    <ErrorCard title="Error" message={errorMessage} goBack={router.back} retry={fetchChannelDetails} />
                ) : (
                    <>
                        {/* Channel Name Section */}
                        <Card>
                            <Box
                                px={6}
                                py={4}
                                borderBottom="1px solid"
                                borderColor="gray.200"
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <Text
                                    style={{
                                        color: '#0A0A0A',
                                        fontFamily: 'Inter, sans-serif',
                                        fontSize: '24px',
                                        fontWeight: 700,
                                        lineHeight: '32px',
                                    }}
                                >
                                    {channelName}
                                </Text>
                                <Flex alignItems="center" gap={3}>
                                    <Flex alignItems="center" gap={2}>
                                        <CheckCircleIcon width={16} height={16} color="green" />
                                        <Select
                                            value="connected"
                                            size="sm"
                                            width="120px"
                                            borderColor="gray.300"
                                        >
                                            <option value="connected">Connected</option>
                                            <option value="disconnected">Disconnected</option>
                                        </Select>
                                    </Flex>
                                    <PrimaryButton showIcon icon={<PencilSquareIcon width={16} height={16} />} onClick={editDisclosure.onOpen}>
                                        Edit
                                    </PrimaryButton>
                                </Flex>
                            </Box>
                            <Box p={6}>
                                <Flex direction="column" gap={6}>
                                    <Text fontSize="md" color="gray.600">
                                        {channelDescription}
                                    </Text>

                                    <Grid templateColumns="1fr 1fr" gap={8}>
                                    {/* Left Side */}
                                    <Flex direction="column" gap={4}>
                                        <Box>
                                            <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                                Catalyst Access URL
                                            </Text>
                                            <Flex alignItems="center" gap={2}>
                                                <Box
                                                    flex={1}
                                                    p={3}
                                                    bg="gray.50"
                                                    borderRadius="md"
                                                    border="1px solid"
                                                    borderColor="gray.200"
                                                    fontSize="sm"
                                                    fontFamily="mono"
                                                    overflow="hidden"
                                                    textOverflow="ellipsis"
                                                    whiteSpace="nowrap"
                                                >
                                                    {gatewayUrl}
                                                </Box>
                                                <IconButton
                                                    aria-label="Copy URL"
                                                    icon={<DocumentDuplicateIcon width={16} height={16} />}
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => copyToClipboard(gatewayUrl)}
                                                />
                                            </Flex>
                                        </Box>
                                        <Box>
                                            <Flex justifyContent="space-between" alignItems="center" mb={2}>
                                                <Text fontSize="sm" fontWeight="semibold">
                                                    Schema
                                                </Text>
                                                <IconButton
                                                    aria-label="Add Schema"
                                                    icon={<PlusIcon width={16} height={16} />}
                                                    size="sm"
                                                    variant="ghost"
                                                />
                                            </Flex>
                                        </Box>
                                    </Flex>

                                    {/* Right Side */}
                                    <Flex direction="column" gap={3}>
                                        <Box>
                                            <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                                Channel Status:
                                            </Text>
                                            <Badges style={channel?.accessSwitch ? 'positive' : 'default'}>
                                                <Flex alignItems="center" gap={1.5}>
                                                    <CheckCircleIcon width={16} height={16} />
                                                    {channelStatus}
                                                </Flex>
                                            </Badges>
                                        </Box>
                                        <Box>
                                            <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                                Validity:
                                            </Text>
                                            <Flex alignItems="center" gap={2}>
                                                <Badges style={complianceStatus === 'Compliant' ? 'positive' : 'danger'}>
                                                    <Flex alignItems="center" gap={1.5}>
                                                        <CheckCircleIcon width={16} height={16} />
                                                        {complianceStatus}
                                                    </Flex>
                                                </Badges>
                                                <IconButton
                                                    aria-label="Refresh Compliance"
                                                    icon={<ArrowPathIcon width={16} height={16} />}
                                                    size="sm"
                                                    variant="ghost"
                                                />
                                            </Flex>
                                        </Box>
                                        <Box>
                                            <Text fontSize="sm" fontWeight="semibold">
                                                Channel Type: API
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="sm" fontWeight="semibold">
                                                Created On: {createdDate}
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="sm" fontWeight="semibold">
                                                Updated On: {updatedDate}
                                            </Text>
                                        </Box>
                                    </Flex>
                                    </Grid>
                                </Flex>
                            </Box>
                        </Card>

                        {/* Sharing List Section */}
                        <Card className="p-6">
                            <Flex direction="column" gap={4}>
                                <Text fontSize="2xl" fontWeight="bold">
                                    Sharing List
                                </Text>

                                <Flex gap={3} alignItems="center">
                                    <Box flex={1}>
                                        <TextInputAndButton
                                            value={searchTerm}
                                            onChange={(val: string) => {
                                                setSearchTerm(val);
                                                setCurrentPage(1);
                                            }}
                                            size="medium"
                                            state="default"
                                        >
                                            <TextInputAndButton.Container>
                                                <TextInputAndButton.Input placeholder="Search partners" />
                                                <TextInputAndButton.Button>
                                                    <SearchIcon width={16} height={16} />
                                                </TextInputAndButton.Button>
                                            </TextInputAndButton.Container>
                                        </TextInputAndButton>
                                    </Box>
                                    <PrimaryButton showIcon icon={<PlusIcon width={16} height={16} />}>
                                        Add to list
                                    </PrimaryButton>
                                </Flex>

                                <Box className="w-full overflow-x-auto">
                                    <DataTable size="medium" interactive={true} className="w-full">
                                        <DataTable.Header>
                                            <DataTable.Row>
                                                <DataTable.HeaderCell className="min-w-[200px]">
                                                    Partner
                                                </DataTable.HeaderCell>
                                                <DataTable.HeaderCell className="min-w-[300px]">
                                                    Description
                                                </DataTable.HeaderCell>
                                                <DataTable.HeaderCell alignment="center" className="min-w-[120px]">
                                                    Sharing
                                                </DataTable.HeaderCell>
                                            </DataTable.Row>
                                        </DataTable.Header>
                                        <DataTable.Body>
                                            {paginatedPartners.length > 0 ? (
                                                paginatedPartners.map((partner) => (
                                                    <DataTable.Row key={partner.id}>
                                                        <DataTable.Cell alignment="left">
                                                            <Link
                                                                href={`/partners/${partner.id}`}
                                                                style={{
                                                                    color: '#3182ce',
                                                                    textDecoration: 'none',
                                                                }}
                                                            >
                                                                {partner.name}
                                                            </Link>
                                                        </DataTable.Cell>
                                                        <DataTable.Cell alignment="left">
                                                            <Text noOfLines={1} title={partner.description}>
                                                                {partner.description}
                                                            </Text>
                                                        </DataTable.Cell>
                                                        <DataTable.Cell alignment="center">
                                                            <Switch
                                                                colorScheme="blue"
                                                                isChecked={partner.sharing}
                                                                onChange={(e) => {
                                                                    setPartners(
                                                                        partners.map((p) =>
                                                                            p.id === partner.id
                                                                                ? { ...p, sharing: e.target.checked }
                                                                                : p
                                                                        )
                                                                    );
                                                                }}
                                                            />
                                                        </DataTable.Cell>
                                                    </DataTable.Row>
                                                ))
                                            ) : (
                                                <DataTable.Row>
                                                    <DataTable.Cell alignment="center">
                                                        <Text color="gray.500">No partners found</Text>
                                                    </DataTable.Cell>
                                                    <DataTable.Cell>
                                                        <span></span>
                                                    </DataTable.Cell>
                                                    <DataTable.Cell>
                                                        <span></span>
                                                    </DataTable.Cell>
                                                </DataTable.Row>
                                            )}
                                        </DataTable.Body>
                                    </DataTable>
                                </Box>

                                {filteredPartners.length > 0 && (
                                    <Flex justifyContent="space-between" alignItems="center">
                                        <Pagination
                                            selected={currentPage}
                                            totalResults={filteredPartners.length}
                                            itemsPerPage={itemsPerPage}
                                            onPageChange={(page: number) => setCurrentPage(page)}
                                            onItemsPerPageChange={() => {}}
                                            showResultCount
                                            showSelectCount
                                        />
                                        <Text fontSize="sm" color="gray.600">
                                            Show {itemsPerPage}
                                        </Text>
                                    </Flex>
                                )}
                            </Flex>
                        </Card>
                    </>
                )}
            </Flex>

            {/* Edit Modal */}
            <Modal isOpen={editDisclosure.isOpen} onClose={editDisclosure.onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Edit Data Channel</ModalHeader>
                    <ModalBody>
                        <Text>Edit functionality will be implemented here</Text>
                    </ModalBody>
                    <ModalFooter>
                        <OrbisButton colorScheme="gray" mr={3} onClick={editDisclosure.onClose}>
                            Cancel
                        </OrbisButton>
                        <OrbisButton onClick={editDisclosure.onClose}>Save</OrbisButton>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Delete Modal */}
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
                            <OrbisButton
                                colorScheme="red"
                                onClick={() => {
                                    if (id && typeof id === 'string' && token)
                                        deleteChannel(id, token)
                                            .then(() => {
                                                onClose();
                                                router.push('/channels');
                                            })
                                            .catch(() => {
                                                onClose();
                                                setHasError(true);
                                                setErrorMessage(
                                                    'An error occurred while deleting the channel. Please try again later.'
                                                );
                                            });
                                }}
                            >
                                Delete
                            </OrbisButton>
                        </Flex>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
