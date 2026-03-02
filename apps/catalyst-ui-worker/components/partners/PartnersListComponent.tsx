'use client';
import {
    CreateButton,
    ErrorCard,
    OpenButton,
    OrbisButton,
    OrbisCard,
    OrbisTable,
    TrashButton,
} from '@/components/elements';
import { ListView } from '@/components/layouts';
import { navigationItems } from '@/utils/nav.utils';
import { Box, Flex, Stack, StackDivider, StackItem, Text } from '@chakra-ui/layout';
import {
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Switch,
    useDisclosure,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '../contexts/User/UserContext';
import { OrgInvite } from '@catalyst/schemas';
type PartnersListComponentProps = {
    listInvites: () => Promise<OrgInvite[]>;
    declineInvite: (inviteId: string) => Promise<OrgInvite>;
    togglePartnership(orgId: string): Promise<OrgInvite>;
};
export default function PartnersListComponent({
    listInvites,
    declineInvite,
    togglePartnership,
}: PartnersListComponentProps) {
    const router = useRouter();
    const [hasError, setHasError] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [partners, setPartners] = useState<OrgInvite[]>([]);
    const [invitations, setInvitations] = useState<OrgInvite[]>([]);
    const [selectedPartner, setSelectedPartner] = useState<OrgInvite | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const { user } = useUser();
    const { isOpen, onOpen, onClose } = useDisclosure();

    const fetchInvites = useCallback(() => {
        setHasError(false);
        return listInvites()
            .then((invites) => {
                const partners: OrgInvite[] = [];
                const invitations: OrgInvite[] = [];
                invites.forEach((invite) => {
                    if (invite.status === 'accepted') {
                        partners.push(invite);
                    }
                    if (invite.status === 'pending') {
                        invitations.push(invite);
                    }
                });
                setPartners(partners);
                setInvitations(invitations);
            })
            .catch(() => {
                setHasError(true);
                setErrorMessage('An error occurred while fetching the invites. Please try again later.');
            });
    }, [listInvites]);

    const deletePartner = useCallback(
        (inviteID: string) => {
            onClose();
            return declineInvite(inviteID)
                .then(fetchInvites)
                .catch(() => {
                    setHasError(true);
                    setErrorMessage('An error occurred while cancelling the partnership. Please try again later.');
                });
        },
        [declineInvite, fetchInvites, onClose]
    );

    useEffect(() => {
        fetchInvites();
    }, [fetchInvites]);

    return (
        <ListView
            topbaractions={navigationItems}
            actions={
                user?.custom.isAdmin ? (
                    <Flex gap={5}>
                        <CreateButton
                            data-testid="partners-create-button"
                            onClick={() => {
                                router.push('/partners/invite');
                            }}
                        />
                    </Flex>
                ) : undefined
            }
            headerTitle={{
                text: 'Partners',
            }}
            positionChildren="bottom"
            subtitle="Partners you can trust."
            table={
                hasError ? (
                    <ErrorCard title="Error" message={errorMessage} retry={fetchInvites} />
                ) : (
                    <Flex gap={5}>
                        <OrbisCard header={'Partners'} pb={0} flex={3} h="min-content" data-testid="partners-list-card">
                            {partners.length > 0 ? (
                                <OrbisTable
                                    headers={['Partner']}
                                    rows={partners.map((partner) => [
                                        <Box key={partner.id} data-testid={`partners-row-${partner.id}`}>
                                            <Flex justifyContent={'space-between'} align={'center'}>
                                                <Box>
                                                    <OpenButton
                                                        onClick={() =>
                                                            router.push(
                                                                '/partners/' +
                                                                    (partner.sender === user?.custom.org
                                                                        ? partner.receiver
                                                                        : partner.sender)
                                                            )
                                                        }
                                                    >
                                                        {partner.sender === user?.custom.org
                                                            ? partner.receiver
                                                            : partner.sender}
                                                    </OpenButton>
                                                    <PartnerSharingStatus
                                                        partner={partner}
                                                        currentOrg={user?.custom.org as string | undefined}
                                                    />
                                                </Box>
                                                {user?.custom.isAdmin ? (
                                                    <Flex gap={10} align={'center'}>
                                                        <Switch
                                                            data-testid={`partners-row-${partner.id}-toggle`}
                                                            colorScheme="green"
                                                            isChecked={
                                                                partner.sender === user?.custom.org
                                                                    ? partner.senderEnabled
                                                                    : partner.receiverEnabled
                                                            }
                                                            isDisabled={togglingId === partner.id}
                                                            onChange={() => {
                                                                setTogglingId(partner.id);
                                                                togglePartnership(partner.id)
                                                                    .then(fetchInvites)
                                                                    .catch(() => {
                                                                        setHasError(true);
                                                                        setErrorMessage(
                                                                            'An error occurred while toggling the partner. Please try again later.'
                                                                        );
                                                                    })
                                                                    .finally(() => setTogglingId(null));
                                                            }}
                                                        />
                                                        <TrashButton
                                                            data-testid={`partners-row-${partner.id}-delete`}
                                                            onClick={() => {
                                                                setSelectedPartner(partner);
                                                                onOpen();
                                                            }}
                                                        />
                                                    </Flex>
                                                ) : null}
                                            </Flex>
                                        </Box>,
                                    ])}
                                    tableProps={{}}
                                />
                            ) : (
                                <Text my={5}>No Partners</Text>
                            )}
                        </OrbisCard>
                        <OrbisCard
                            header={`Invitations (${invitations.length})`}
                            h={'min-content'}
                            flex={2}
                            data-testid="partners-invitations-card"
                        >
                            {invitations.length > 0 ? (
                                <Stack divider={<StackDivider />}>
                                    {invitations.map((invitation) => (
                                        <StackItem key={invitation.id}>
                                            <OpenButton
                                                onClick={() => router.push(`/partners/invite/accept/${invitation.id}`)}
                                            >
                                                <OrgInviteMessage
                                                    org={user?.custom.org as string}
                                                    invite={invitation}
                                                />
                                            </OpenButton>
                                        </StackItem>
                                    ))}
                                </Stack>
                            ) : (
                                <Text mt={5}>No Invitations</Text>
                            )}
                        </OrbisCard>
                    </Flex>
                )
            }
            topbartitle="Partners"
        >
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Cancel Partnership</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <p>Are you sure you want to cancel this partnership? This action cannot be undone.</p>
                    </ModalBody>
                    <ModalFooter>
                        <Flex justify={'flex-end'} gap={5}>
                            <OrbisButton
                                colorScheme="red"
                                onClick={() => {
                                    if (selectedPartner?.id) {
                                        deletePartner(selectedPartner.id);
                                    }
                                }}
                            >
                                Cancel Partnership
                            </OrbisButton>
                            <OrbisButton colorScheme="gray" onClick={onClose}>
                                Cancel
                            </OrbisButton>
                        </Flex>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </ListView>
    );
}

const PartnerSharingStatus = ({ partner, currentOrg }: { partner: OrgInvite; currentOrg?: string }) => {
    const isSender = partner.sender === currentOrg;
    const partnerIsSharing = isSender ? partner.receiverEnabled : partner.senderEnabled;
    const partnerName = isSender ? partner.receiver : partner.sender;

    return (
        <Text fontSize="xs" color={partnerIsSharing ? 'green.500' : 'gray.500'} mt={1}>
            {partnerIsSharing ? `${partnerName} is sharing with you` : `${partnerName} is not sharing with you`}
        </Text>
    );
};

const OrgInviteMessage = ({ invite, org }: { invite: OrgInvite; org: string }) => (
    <Text>
        {invite.sender === org
            ? `You invited ${invite.receiver} to partner with your organization.`
            : `${invite.sender} invited your organization to partner with them.`}
    </Text>
);
