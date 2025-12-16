'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { Box, Flex, Grid } from '@chakra-ui/react';
import { useDisclosure } from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { DataChannel, DataChannelActionResponse } from '@catalyst/schemas';
import { Card, Loading } from '@orbisoperations/o2-ui';

// Context
import { useUser } from '../contexts/User/UserContext';

// Custom hooks
import { useChannelDetails, useChannelSharing, useChannelCompliance } from '@/hooks/channels';

// Extracted components
import { ErrorCard } from '@/components/elements';
import { ChannelDetailHeader } from './ChannelDetailHeader';
import { ChannelInfoCard } from './ChannelInfoCard';
import { ChannelMetadataPanel } from './ChannelMetadataPanel';
import { SharingList } from './SharingList';
import { DeleteChannelModal } from './DeleteChannelModal';
import EditChannelModal from './EditChannelModal';

// Types
import type { ComplianceStatus } from './ChannelComplianceBadge';

type DataChannelDetailsProps = {
    channelDetails: (id: string, token: string) => Promise<DataChannel>;
    updateChannel: (data: FormData, token: string) => Promise<DataChannelActionResponse>;
    deleteChannel: (id: string, token: string) => Promise<DataChannel>;
    handleSwitch?: (channelId: string, accessSwitch: boolean, token: string) => Promise<DataChannel>;
};

/**
 * Utility to format date strings for display.
 */
function formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

/**
 * Main channel details component.
 *
 * Composes extracted components for a cleaner, more maintainable structure:
 * - ChannelDetailHeader: Title, status dropdown, edit button
 * - ChannelInfoCard: Description, gateway URL, schema section
 * - ChannelMetadataPanel: Status, compliance, type, dates
 * - SharingList: Partner sharing management
 */
export default function DataChannelDetailsComponent({
    channelDetails,
    updateChannel,
    deleteChannel,
}: DataChannelDetailsProps) {
    const router = useRouter();
    const { user, token } = useUser();
    const { id } = useParams();
    const channelId = typeof id === 'string' ? id : undefined;

    // Modal disclosures
    const editDisclosure = useDisclosure();
    const deleteDisclosure = useDisclosure();

    // Gateway URL state
    const [gatewayUrl, setGatewayUrl] = useState<string>('https://gateway.catalyst.intelops.io/graphql');
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');

    // Channel details hook
    const { channel, isLoading, hasError, errorMessage, refetch } = useChannelDetails({
        channelDetails,
        channelId,
        token,
        autoFetch: true,
    });

    // Sharing hook
    const {
        partners,
        isLoading: isSharingLoading,
        hasError: sharingHasError,
        refresh: refreshSharing,
        search: sharingSearch,
        setSearch: setSharingSearch,
        currentPage: sharingPage,
        setCurrentPage: setSharingPage,
        itemsPerPage: sharingItemsPerPage,
        setItemsPerPage: setSharingItemsPerPage,
        toggleSharing,
    } = useChannelSharing({ channelId, token });

    // Compliance hook (for refresh functionality)
    const { complianceResults, checkingCompliance, checkCompliance } = useChannelCompliance();

    // Determine if channel is owned by current user
    const userOrg = user?.custom?.org as string | undefined;
    const isOwned = useMemo(() => channel?.creatorOrganization === userOrg, [channel?.creatorOrganization, userOrg]);

    // Get compliance status for this channel
    const complianceStatus = useMemo((): ComplianceStatus | undefined => {
        if (!channel) return undefined;
        const result = complianceResults[channel.id];
        if (result) return result.status as ComplianceStatus;
        // DataChannel schema doesn't include lastComplianceResult yet
        return undefined;
    }, [channel, complianceResults]);

    const isCheckingCompliance = channel ? (checkingCompliance[channel.id] ?? false) : false;

    // Deletion state
    const [isDeleting, setIsDeleting] = useState(false);

    // Initialize gateway URL from window location
    useEffect(() => {
        if (typeof window !== 'undefined' && window?.location.origin) {
            const url = window.location.origin.includes('catalyst')
                ? window.location.origin
                : 'https://catalyst.devintelops.io';
            setGatewayUrl(url.replace('catalyst', 'gateway') + '/graphql');
        }
    }, []);

    // Stable handlers
    const handleEditClick = useCallback(() => {
        editDisclosure.onOpen();
    }, [editDisclosure]);

    const handleConnectionStatusChange = useCallback((status: 'connected' | 'disconnected') => {
        setConnectionStatus(status);
    }, []);

    const handleRefreshCompliance = useCallback(async () => {
        if (channel) {
            await checkCompliance(channel);
        }
    }, [channel, checkCompliance]);

    const handleAddSchema = useCallback(() => {
        // TODO: Implement schema addition
        console.log('Add schema clicked');
    }, []);

    const handleAddPartner = useCallback(() => {
        // TODO: Implement partner addition modal
        console.log('Add partner clicked');
    }, []);

    const handleEditSuccess = useCallback(() => {
        editDisclosure.onClose();
        refetch();
    }, [editDisclosure, refetch]);

    const handleEditError = useCallback((message: string) => {
        console.error('Edit error:', message);
    }, []);

    const handleDeleteClick = useCallback(() => {
        editDisclosure.onClose();
        deleteDisclosure.onOpen();
    }, [editDisclosure, deleteDisclosure]);

    const handleDeleteConfirm = useCallback(async () => {
        if (!channelId || !token) return;

        setIsDeleting(true);
        try {
            await deleteChannel(channelId, token);
            deleteDisclosure.onClose();
            router.push('/channels');
        } catch (error) {
            console.error('Delete error:', error);
            deleteDisclosure.onClose();
        } finally {
            setIsDeleting(false);
        }
    }, [channelId, token, deleteChannel, deleteDisclosure, router]);

    const handleDeleteCancel = useCallback(() => {
        deleteDisclosure.onClose();
    }, [deleteDisclosure]);

    // Format timestamps from channel data (returns 'N/A' for legacy channels without timestamps)
    const createdDate = formatDate(channel?.createdAt);
    const updatedDate = formatDate(channel?.updatedAt);

    // Loading state
    if (isLoading || !channel) {
        if (hasError) {
            return (
                <Flex direction="column" gap={6}>
                    <ErrorCard title="Error" message={errorMessage} goBack={router.back} retry={refetch} />
                </Flex>
            );
        }
        return (
            <Flex justify="center" align="center" minH="400px">
                <Loading data-testid="channel-details-loading" />
            </Flex>
        );
    }

    return (
        <>
            {/* Edit Modal */}
            <EditChannelModal
                isOpen={editDisclosure.isOpen}
                onClose={editDisclosure.onClose}
                channel={channel}
                userOrg={userOrg}
                token={token}
                updateChannel={updateChannel}
                onSuccess={handleEditSuccess}
                onError={handleEditError}
                onDeleteClick={handleDeleteClick}
            />

            {/* Delete Confirmation Modal */}
            <DeleteChannelModal
                isOpen={deleteDisclosure.isOpen}
                isDeleting={isDeleting}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
            />

            <Flex direction="column" gap={6}>
                {/* Channel Info Card */}
                <Card>
                    {/* Header */}
                    <ChannelDetailHeader
                        channelName={channel.name}
                        connectionStatus={connectionStatus}
                        onConnectionStatusChange={handleConnectionStatusChange}
                        onEditClick={handleEditClick}
                    />

                    {/* Content */}
                    <Box p={6}>
                        <Grid templateColumns="1fr 1fr" gap={8}>
                            {/* Left: Info */}
                            <ChannelInfoCard
                                description={channel.description}
                                gatewayUrl={gatewayUrl}
                                showSchema={isOwned}
                                onAddSchema={handleAddSchema}
                            />

                            {/* Right: Metadata */}
                            <ChannelMetadataPanel
                                accessSwitch={channel.accessSwitch}
                                complianceStatus={complianceStatus}
                                isOwned={isOwned}
                                channelType="API"
                                createdOn={createdDate}
                                updatedOn={updatedDate}
                                onRefreshCompliance={isOwned ? handleRefreshCompliance : undefined}
                                isRefreshingCompliance={isCheckingCompliance}
                            />
                        </Grid>
                    </Box>
                </Card>

                {/* Sharing List - Only shown for owned channels */}
                {isOwned && (
                    <SharingList
                        partners={partners}
                        search={sharingSearch}
                        onSearchChange={setSharingSearch}
                        onToggleSharing={toggleSharing}
                        onAddClick={handleAddPartner}
                        itemsPerPage={sharingItemsPerPage}
                        currentPage={sharingPage}
                        onPageChange={setSharingPage}
                        onItemsPerPageChange={setSharingItemsPerPage}
                        isLoading={isSharingLoading}
                        hasError={sharingHasError}
                        onRetry={refreshSharing}
                    />
                )}
            </Flex>
        </>
    );
}
