'use client';
import { ErrorCard, OrbisButton } from '@/components/elements';
import { Flex, Text } from '@chakra-ui/layout';
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Spinner,
    useDisclosure,
} from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DataChannel, DataChannelActionResponse } from '@catalyst/schemas';
import { useUser } from '../contexts/User/UserContext';
import ChannelInformation from './ChannelInformation';
import EditChannelModal from './EditChannelModal';

type DataChannelDetailsProps = {
    channelDetails: (id: string, token: string) => Promise<DataChannel>;
    updateChannel: (data: FormData, token: string) => Promise<DataChannelActionResponse>;
    deleteChannel: (id: string, token: string) => Promise<DataChannel>;
};

export default function DataChannelDetailsComponent({
    channelDetails,
    updateChannel,
    deleteChannel,
}: DataChannelDetailsProps) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const editDisclosure = useDisclosure();
    const router = useRouter();
    const { user, token } = useUser();
    const { id } = useParams();
    const [channel, setChannel] = useState<DataChannel>();
    const [hasError, setHasError] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');

    function fetchChannelDetails() {
        setHasError(false);
        if (id && typeof id === 'string' && token)
            channelDetails(id, token)
                .then((data) => {
                    setChannel(data);
                    editDisclosure.onClose();
                })
                .catch((e) => {
                    setHasError(true);
                    setErrorMessage('An error occurred while fetching the channel details. Does the channel exist?');
                    console.error(e);
                });
    }

    useEffect(fetchChannelDetails, [token]);

    return (
        <>
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

            {/* Edit Modal */}
            <EditChannelModal
                isOpen={editDisclosure.isOpen}
                onClose={editDisclosure.onClose}
                channel={channel}
                userOrg={user?.custom.org as string}
                token={token}
                updateChannel={updateChannel}
                onSuccess={fetchChannelDetails}
                onError={(message) => {
                    setHasError(true);
                    setErrorMessage(message);
                }}
                onDeleteClick={onOpen}
            />

            {!channel && !hasError ? (
                <Flex justify="center" align="center" minH="400px">
                    <Spinner size="xl" />
                </Flex>
            ) : hasError ? (
                <ErrorCard title="Error" message={errorMessage} goBack={router.back} retry={fetchChannelDetails} />
            ) : (
                <ChannelInformation channel={channel} onEditClick={editDisclosure.onOpen} />
            )}
        </>
    );
}
