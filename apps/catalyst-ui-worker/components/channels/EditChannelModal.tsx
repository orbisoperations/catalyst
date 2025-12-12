'use client';
import { OrbisButton } from '@/components/elements';
import { Flex, Grid } from '@chakra-ui/layout';
import {
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select,
    Textarea,
} from '@chakra-ui/react';
import { DataChannel, DataChannelActionResponse } from '@catalyst/schemas';
import { useState, useEffect } from 'react';

type EditChannelModalProps = {
    isOpen: boolean;
    onClose: () => void;
    channel?: DataChannel;
    userOrg?: string;
    token?: string;
    updateChannel: (data: FormData, token: string) => Promise<DataChannelActionResponse>;
    onSuccess: () => void;
    onError: (message: string) => void;
    onDeleteClick: () => void;
};

export default function EditChannelModal({
    isOpen,
    onClose,
    channel,
    userOrg,
    token,
    updateChannel,
    onSuccess,
    onError,
    onDeleteClick,
}: EditChannelModalProps) {
    const [editChannel, setEditChannel] = useState<DataChannel | undefined>(channel);
    const [nameError, setNameError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [channelType, setChannelType] = useState<string>('API');

    // Update editChannel when channel prop or modal opens
    useEffect(() => {
        if (isOpen && channel) {
            setEditChannel(channel);
        }
    }, [isOpen, channel]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setNameError(''); // Clear previous errors
        const formData = new FormData(e.currentTarget);
        if (editChannel && token) {
            formData.append('id', editChannel.id);
            formData.append('organization', String(userOrg));
            updateChannel(formData, token)
                .then((result) => {
                    if (result.success) {
                        onSuccess();
                    } else {
                        // Determine if it's a validation error from error message patterns
                        const isValidationError =
                            result.error.includes('already exists in your organization') ||
                            result.error.includes('Invalid data channel') ||
                            result.error.includes('Channel name') ||
                            result.error.includes('cannot be only whitespace') ||
                            result.error.includes('Only letters, numbers, and standard symbols') ||
                            result.error.includes('cannot contain HTML') ||
                            result.error.includes('cannot contain script') ||
                            result.error.includes('contains potentially dangerous') ||
                            result.error.includes('is required') ||
                            result.error.includes('must be') ||
                            result.error.includes('characters or less') ||
                            result.error.includes('invalid characters');
                        if (isValidationError) {
                            setNameError(result.error);
                        } else {
                            onClose();
                            onError('An error occurred while updating the channel. Please try again later.');
                        }
                    }
                })
                .catch((e) => {
                    // Only catch unexpected errors (should not happen with result pattern)
                    console.error('Unexpected error:', e);
                    onClose();
                    onError('An error occurred while updating the channel. Please try again later.');
                })
                .finally(() => {
                    setIsSubmitting(false);
                });
        }
    };

    const handleCancel = () => {
        onClose();
        setEditChannel(channel);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader py={6} px={6} borderBottom="1px solid" borderColor="gray.200">
                    Edit channel details
                </ModalHeader>
                <ModalCloseButton top={6} right={6} />
                <form onSubmit={handleSubmit}>
                    <ModalBody py={6} px={6}>
                        <Grid gap={4}>
                            <FormControl display={'grid'} gap={1} isInvalid={!!nameError}>
                                <FormLabel htmlFor="name" mb={0}>
                                    Name
                                </FormLabel>
                                <Input
                                    rounded="md"
                                    name="name"
                                    required={true}
                                    defaultValue={editChannel?.name}
                                    onChange={(e) => {
                                        if (editChannel) {
                                            setEditChannel({
                                                ...editChannel,
                                                name: e.target.value,
                                            });
                                        }
                                    }}
                                    placeholder="Channel name"
                                    maxLength={64}
                                    isDisabled={isSubmitting}
                                />
                                {nameError && <FormErrorMessage>{nameError}</FormErrorMessage>}
                            </FormControl>
                            <FormControl display={'grid'} gap={1}>
                                <FormLabel htmlFor="description" mb={0}>
                                    Description
                                </FormLabel>
                                <Textarea
                                    rounded="md"
                                    name="description"
                                    required={true}
                                    value={editChannel?.description}
                                    onChange={(e) => {
                                        if (editChannel) {
                                            setEditChannel({
                                                ...editChannel,
                                                description: e.target.value,
                                            });
                                        }
                                    }}
                                    placeholder="Description"
                                />
                            </FormControl>
                            <FormControl display={'grid'} gap={1}>
                                <FormLabel htmlFor="endpoint" mb={0}>
                                    Catalyst access URL
                                </FormLabel>
                                <Input
                                    rounded="md"
                                    name="endpoint"
                                    required={true}
                                    value={editChannel?.endpoint}
                                    onChange={(e) => {
                                        if (editChannel) {
                                            setEditChannel({
                                                ...editChannel,
                                                endpoint: e.target.value,
                                            });
                                        }
                                    }}
                                    placeholder="Catalyst access URL"
                                />
                            </FormControl>
                            <FormControl display={'grid'} gap={1}>
                                <FormLabel htmlFor="channelType" mb={0}>
                                    Channel type
                                </FormLabel>
                                <Select
                                    rounded="md"
                                    name="channelType"
                                    value={channelType}
                                    onChange={(e) => setChannelType(e.target.value)}
                                >
                                    <option value="API">API</option>
                                </Select>
                            </FormControl>
                            <FormControl display={'none'}>
                                <label htmlFor="accessSwitch"></label>
                                <Input
                                    rounded="md"
                                    name="accessSwitch"
                                    required={true}
                                    defaultValue={editChannel?.accessSwitch ? 'on' : 'off'}
                                />
                            </FormControl>
                        </Grid>
                    </ModalBody>
                    <ModalFooter py={6} px={6} borderTop="1px solid" borderColor="gray.200">
                        <Flex justifyContent="space-between" width="100%">
                            <Button
                                variant="link"
                                colorScheme="red"
                                onClick={onDeleteClick}
                                isDisabled={isSubmitting}
                                textDecoration="none"
                                _hover={{ textDecoration: 'none' }}
                            >
                                Delete channel
                            </Button>
                            <Flex gap={3}>
                                <OrbisButton colorScheme="gray" onClick={handleCancel} isDisabled={isSubmitting}>
                                    Cancel
                                </OrbisButton>
                                <OrbisButton type="submit" isLoading={isSubmitting} loadingText="Saving...">
                                    Save
                                </OrbisButton>
                            </Flex>
                        </Flex>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
}
