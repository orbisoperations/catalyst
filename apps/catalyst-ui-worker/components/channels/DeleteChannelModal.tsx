'use client';

import { OrbisButton } from '@/components/elements';
import { Flex } from '@chakra-ui/layout';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Text } from '@chakra-ui/react';

export interface DeleteChannelModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Whether a delete operation is in progress */
    isDeleting?: boolean;
    /** Callback when the modal is closed (Cancel button or overlay click) */
    onClose: () => void;
    /** Callback when delete is confirmed */
    onConfirm: () => void;
}

/**
 * Confirmation modal for deleting a data channel.
 *
 * Shows a warning message and requires user confirmation before proceeding.
 */
export function DeleteChannelModal({ isOpen, isDeleting = false, onClose, onConfirm }: DeleteChannelModalProps) {
    return (
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
                        <OrbisButton
                            data-testid="modal-cancel-button"
                            colorScheme="gray"
                            onClick={onClose}
                            isDisabled={isDeleting}
                        >
                            Cancel
                        </OrbisButton>
                        <OrbisButton
                            data-testid="modal-confirm-button"
                            colorScheme="red"
                            onClick={onConfirm}
                            isLoading={isDeleting}
                            loadingText="Deleting..."
                        >
                            Delete
                        </OrbisButton>
                    </Flex>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
