'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FormControl,
    FormLabel,
    Grid,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    Flex,
    FormErrorMessage,
    useDisclosure,
} from '@chakra-ui/react';
import { OrbisButton } from '@/components/elements';
import { createDataChannel } from '@/app/actions/channels';
import { DataChannel } from '@catalyst/schemas';

type CreateChannelModalProps = {
    disclosure: ReturnType<typeof useDisclosure>;
    user?: { custom: { org?: string } };
    token?: string;
};

export function CreateChannelModal({ disclosure, user, token }: CreateChannelModalProps) {
    const router = useRouter();
    const [newChannel, setNewChannel] = useState<Omit<DataChannel, 'id'>>({
        name: '',
        description: '',
        endpoint: '',
        creatorOrganization: String(user?.custom.org || ''),
        accessSwitch: true,
    });
    const [nameError, setNameError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Update creatorOrganization when user changes
    useEffect(() => {
        if (user?.custom.org) {
            setNewChannel((prev) => ({
                ...prev,
                creatorOrganization: String(user.custom.org),
            }));
        }
    }, [user?.custom.org]);

    const resetForm = () => {
        setNewChannel({
            name: '',
            description: '',
            endpoint: '',
            creatorOrganization: String(user?.custom.org || ''),
            accessSwitch: true,
        });
        setNameError('');
    };

    const handleSubmit = (formData: FormData) => {
        setIsSubmitting(true);
        setNameError('');
        formData.set('organization', user?.custom.org || '');

        if (!token) {
            setNameError('Authentication required');
            setIsSubmitting(false);
            return;
        }

        createDataChannel(formData, token)
            .then((result) => {
                if (result.success && result.data) {
                    disclosure.onClose();
                    resetForm();
                    router.push('/channels/' + result.data.id);
                } else {
                    const isValidationError =
                        result.error?.includes('already exists in your organization') ||
                        result.error?.includes('Invalid data channel') ||
                        result.error?.includes('Channel name') ||
                        result.error?.includes('cannot be only whitespace') ||
                        result.error?.includes('Only letters, numbers, and standard symbols') ||
                        result.error?.includes('cannot contain HTML') ||
                        result.error?.includes('must be between');

                    if (isValidationError) {
                        setNameError(result.error || 'Validation error');
                    } else {
                        setNameError(result.error || 'Failed to create channel');
                    }
                    setIsSubmitting(false);
                }
            })
            .catch((error) => {
                console.error('Failed to create channel:', error);
                setNameError('An unexpected error occurred');
                setIsSubmitting(false);
            });
    };

    return (
        <Modal isOpen={disclosure.isOpen} onClose={disclosure.onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <Text>Create Data Channel</Text>
                    <Text fontSize="sm" color="var(--color-content-50)" fontWeight="normal" mt={2}>
                        It can be shared with selected partners when needed.
                    </Text>
                </ModalHeader>
                <ModalCloseButton />
                <form action={handleSubmit}>
                    <ModalBody pb={6}>
                        <Grid gap={5}>
                            <FormControl display="grid" gap={2} isInvalid={!!nameError}>
                                <FormLabel htmlFor="name">Channel Name</FormLabel>
                                <Input
                                    rounded="md"
                                    value={newChannel.name}
                                    onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                                    name="name"
                                    required
                                    placeholder="Data Channel Name"
                                    maxLength={64}
                                    isDisabled={isSubmitting}
                                />
                                {nameError && <FormErrorMessage>{nameError}</FormErrorMessage>}
                            </FormControl>
                            <FormControl display="grid" gap={2}>
                                <FormLabel htmlFor="description">Channel Description</FormLabel>
                                <Input
                                    rounded="md"
                                    value={newChannel.description}
                                    onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                                    name="description"
                                    required
                                    placeholder="Description"
                                    isDisabled={isSubmitting}
                                />
                            </FormControl>
                            <FormControl display="grid" gap={2}>
                                <FormLabel htmlFor="endpoint">Endpoint / URL</FormLabel>
                                <Input
                                    rounded="md"
                                    name="endpoint"
                                    value={newChannel.endpoint}
                                    onChange={(e) => setNewChannel({ ...newChannel, endpoint: e.target.value })}
                                    required
                                    placeholder="Endpoint URL"
                                    isDisabled={isSubmitting}
                                />
                            </FormControl>
                        </Grid>
                    </ModalBody>
                    <ModalFooter>
                        <Flex justifyContent="space-between" width="100%">
                            <OrbisButton
                                colorScheme="gray"
                                onClick={() => {
                                    disclosure.onClose();
                                    resetForm();
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
    );
}
