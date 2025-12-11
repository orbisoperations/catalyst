'use client';
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
    Textarea,
    useDisclosure,
} from '@chakra-ui/react';
import { OrbisButton } from '@/components/elements';
import React from 'react';

type FeedbackModalProps = {
    disclosure: ReturnType<typeof useDisclosure>;
};

export function FeedbackModal({ disclosure }: FeedbackModalProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        disclosure.onClose();
    };

    return (
        <Modal isOpen={disclosure.isOpen} onClose={disclosure.onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Feel free to reach out</ModalHeader>
                <ModalCloseButton />
                <form onSubmit={handleSubmit}>
                    <ModalBody>
                        <Grid gap={5}>
                            <FormControl isRequired>
                                <FormLabel>Email</FormLabel>
                                <Input placeholder="Email" rounded="md" />
                            </FormControl>
                            <FormControl isRequired>
                                <FormLabel>Message</FormLabel>
                                <Textarea />
                            </FormControl>
                        </Grid>
                    </ModalBody>
                    <ModalFooter>
                        <OrbisButton type="submit">Submit</OrbisButton>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
}
