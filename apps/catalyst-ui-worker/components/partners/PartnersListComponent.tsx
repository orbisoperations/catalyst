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
import { useEffect, useState } from 'react';
import { useUser } from '../contexts/User/UserContext';
import { OrgInvite } from '@catalyst/schemas';
type PartnersListComponentProps = {
    listInvites: (token: string) => Promise<OrgInvite[]>;
    declineInvite: (inviteId: string, token: string) => Promise<OrgInvite>;
    togglePartnership(orgId: string, token: string): Promise<OrgInvite>;
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
    const { token, user } = useUser();
    function fetchInvites() {
        setHasError(false);
        if (token)
            return listInvites(token)
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
                .catch((e) => {
                    setHasError(true);
                    setErrorMessage('An error occurred while fetching the invites. Please try again later.');
                    console.error(e);
                });
        return Promise.resolve();
    }

    function deletePartner(inviteID: string) {
        onClose();
        return declineInvite(inviteID, token ?? '')
            .then(fetchInvites)
            .catch(() => {
                setHasError(true);
                setErrorMessage('An error occurred while accepting the invite. Please try again later.');
            });
    }
    useEffect(() => {
        fetchInvites();
    }, [token]);

    const { isOpen, onOpen, onClose } = useDisclosure();
    return (
        <ListView
            topbaractions={navigationItems}
            actions={
                <Flex gap={5}>
                    <CreateButton
                        onClick={() => {
                            router.push('/partners/invite');
                        }}
                    />
                </Flex>
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
                        <OrbisCard header={'Partners'} pb={0} flex={3} h="min-content">
                            {partners.length > 0 ? (
                                <OrbisTable
                                    headers={['Partner']}
                                    rows={partners.map((partner) => [
                                        <Box key={partner.id}>
                                            <Flex justifyContent={'space-between'}>
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
                                                <Flex gap={10} align={'center'}>
                                                    <Switch
                                                        colorScheme="green"
                                                        defaultChecked={partner.isActive}
                                                        onChange={() => {
                                                            togglePartnership(partner.id, token ?? '')
                                                                .then(fetchInvites)
                                                                .catch(() => {
                                                                    setHasError(true);
                                                                    setErrorMessage(
                                                                        'An error occurred while toggling the partner. Please try again later.'
                                                                    );
                                                                });
                                                        }}
                                                    />
                                                    <TrashButton
                                                        onClick={() => {
                                                            setSelectedPartner(partner);
                                                            onOpen();
                                                        }}
                                                    />
                                                </Flex>
                                            </Flex>
                                        </Box>,
                                    ])}
                                    tableProps={{}}
                                />
                            ) : (
                                <Text my={5}>No Partners</Text>
                            )}
                        </OrbisCard>
                        <OrbisCard header={`Invitations (${invitations.length})`} h={'min-content'} flex={2}>
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
                    <ModalHeader>Cancel Parnership</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <p>Are you sure you want to cancel this partnership? This action cannot be undone.</p>
                    </ModalBody>
                    <ModalFooter>
                        <Flex justify={'flex-end'} gap={5}>
                            <OrbisButton
                                colorScheme="red"
                                onClick={() => {
                                    deletePartner(selectedPartner?.id ?? '');
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

const OrgInviteMessage = ({ invite, org }: { invite: OrgInvite; org: string }) => {
    const [message, setMessage] = useState<string>();
    useEffect(() => {
        if (invite.sender === org) {
            setMessage(`You invited ${invite.receiver} to partner with your organization.`);
        } else {
            setMessage(`${invite.sender} invited your organization to partner with them.`);
        }
    }, [invite, org]);
    return <Text>{message}</Text>;
};
