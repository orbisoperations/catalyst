'use client';

import { ErrorCard, OrbisButton, OrbisCard } from '@/components/elements';
import { DetailedView } from '@/components/layouts';
import { navigationItems } from '@/utils/nav.utils';
import { OrgInvite } from '@catalyst/schemas';
import {
    Flex,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    useDisclosure,
} from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '../contexts/User/UserContext';
type AcceptInviteComponentProps = {
    acceptInvite: (inviteId: string, token: string) => Promise<OrgInvite>;
    declineInvite: (inviteId: string, token: string) => Promise<OrgInvite>;
    readInvite: (inviteId: string, token: string) => Promise<OrgInvite>;
};
export default function AcceptInviteComponent({ acceptInvite, declineInvite, readInvite }: AcceptInviteComponentProps) {
    const router = useRouter();
    const params = useParams();
    const [id, setId] = useState('');
    const [hasError, setHasError] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [invite, setInvite] = useState<OrgInvite | undefined>(undefined);
    const { token, user } = useUser();
    const [orgIsSender, setOrgIsSender] = useState<boolean>(false);
    function fetchInvite() {
        setHasError(false);
        const inviteId = params.id;
        if (typeof inviteId === 'string' && token) {
            setId(inviteId);
            readInvite(inviteId, token)
                .then((res) => {
                    setInvite(res);
                    setOrgIsSender(res?.sender === user?.custom.org);
                })
                .catch(() => {
                    setHasError(true);
                    setErrorMessage('An error occurred while fetching the invite. Please try again later.');
                });
        } else {
            setHasError(true);
            setErrorMessage('An error occurred while fetching the invite. Please try again later.');
        }
    }
    useEffect(fetchInvite, [params.id, token]);

    const { isOpen, onOpen, onClose } = useDisclosure();
    return (
        <DetailedView
            topbartitle="Accept Invite"
            topbaractions={navigationItems}
            showspinner={!invite && !hasError}
            subtitle={
                invite && user
                    ? orgIsSender
                        ? `You invited ${invite?.receiver} to partner with you`
                        : `${invite?.sender} invited you to partner with them`
                    : ''
            }
            headerTitle={{ text: 'Accept Invite' }}
        >
            {hasError ? (
                <ErrorCard title="Error" message={errorMessage} goBack={router.back} retry={fetchInvite} />
            ) : (
                <OrbisCard
                    actions={
                        <Flex gap={5}>
                            <Modal isOpen={isOpen} onClose={onClose}>
                                <ModalOverlay />
                                <ModalContent>
                                    <ModalHeader>Accept Invite</ModalHeader>
                                    <ModalCloseButton />
                                    <ModalBody>
                                        <Text fontSize={'sm'} fontWeight={'bold'} mb={5}>
                                            {orgIsSender ? 'Cancel' : 'Reject'} Invite
                                        </Text>
                                        <p>
                                            Are you sure you want to {orgIsSender ? 'cancel' : 'reject'} this invite?
                                            This action cannot be undone.
                                        </p>
                                    </ModalBody>
                                    <ModalFooter display={'flex'} gap={2}>
                                        <OrbisButton
                                            data-testid="invite-confirm-reject-button"
                                            colorScheme="red"
                                            onClick={() => {
                                                if (token) {
                                                    declineInvite(id, token)
                                                        .then(async () => {
                                                            onClose();
                                                            router.back();
                                                        })
                                                        .catch(() => {
                                                            onClose();
                                                            setHasError(true);
                                                            setErrorMessage(
                                                                `An error occurred while ${orgIsSender ? 'cancelling' : 'rejecting'} the invite. Please try again later.`
                                                            );
                                                        });
                                                }
                                            }}
                                        >
                                            {orgIsSender ? 'Cancel' : 'Reject'}
                                        </OrbisButton>
                                        <OrbisButton colorScheme="gray" onClick={onClose}>
                                            Keep Invite
                                        </OrbisButton>
                                    </ModalFooter>
                                </ModalContent>
                            </Modal>
                            <OrbisButton
                                data-testid="invite-reject-button"
                                variant={'outline'}
                                colorScheme="red"
                                onClick={onOpen}
                            >
                                {orgIsSender ? 'Cancel' : 'Reject'}
                            </OrbisButton>

                            {!orgIsSender && (
                                <OrbisButton
                                    data-testid="invite-accept-button"
                                    onClick={() => {
                                        if (token)
                                            acceptInvite(id, token)
                                                .then(router.back)
                                                .catch(() => {
                                                    setHasError(true);
                                                    setErrorMessage(
                                                        'An error occurred while accepting the invite. Please try again later.'
                                                    );
                                                });
                                    }}
                                >
                                    Accept
                                </OrbisButton>
                            )}
                        </Flex>
                    }
                >
                    <>
                        <Text fontSize={'sm'} fontWeight={'bold'} mb={5}>
                            Invitation message
                        </Text>
                        <p data-testid="invite-message-display">{invite?.message}</p>
                    </>
                </OrbisCard>
            )}
        </DetailedView>
    );
}
