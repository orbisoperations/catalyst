'use client';

import { ErrorCard, OrbisButton } from '@/components/elements';
import { Flex, FormControl, Grid, Input, Text, Textarea } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUser } from '../contexts/User/UserContext';
import { OrgInvite } from '@catalyst/schemas';
type CreateInviteProps = {
    sendInvite: (receivingOrg: string, token: string, message: string) => Promise<OrgInvite>;
};
export default function CreateInviteComponent({ sendInvite }: CreateInviteProps) {
    const router = useRouter();
    const { token, user } = useUser();
    const [hasError, setHasError] = useState<boolean>(false);
    const [inviteState, setInviteState] = useState<{
        org: string;
        message: string;
    }>({
        org: '',
        message: '',
    });
    const [displayError, setDisplayError] = useState<boolean>(false);
    return (
        <>
            {hasError ? (
                <ErrorCard
                    title="Error"
                    message="An error occurred while sending the invite. Please try again later."
                    retry={() => {
                        setHasError(false);
                    }}
                />
            ) : (
                <form
                    action={(formData) => {
                        const org = formData.get('orgId') as string;
                        const message = formData.get('message') as string;
                        if (org === user?.custom.org) {
                            setDisplayError(true);
                            return;
                        }
                        sendInvite(
                            org,
                            token ?? '',
                            message.trim() === '' ? user?.custom.org + ' invited you to partner with them' : message
                        )
                            .then(router.back)
                            .catch(() => {
                                setHasError(true);
                            });
                    }}
                >
                    <Grid gap={5}>
                        <FormControl isRequired>
                            <label htmlFor="orgId">Organization ID</label>
                            <Input
                                required
                                rounded={'md'}
                                name="orgId"
                                value={inviteState.org}
                                onChange={(e) => {
                                    setDisplayError(false);
                                    setInviteState({
                                        ...inviteState,
                                        org: e.target.value,
                                    });
                                }}
                                type="text"
                            />
                            {displayError && (
                                <Text
                                    color={'red'}
                                    fontSize={'sm'}
                                    mt={'1em'}
                                    fontWeight={'semibold'}
                                    textAlign={'center'}
                                >
                                    You cannot invite your own organization
                                </Text>
                            )}
                        </FormControl>
                        <FormControl>
                            <label htmlFor="message">Invite Message</label>
                            <Textarea
                                value={inviteState.message}
                                onChange={(e) => {
                                    setInviteState({
                                        ...inviteState,
                                        message: e.target.value,
                                    });
                                }}
                                name="message"
                            />
                        </FormControl>
                        <Flex justify={'space-between'}>
                            <OrbisButton colorScheme="gray" onClick={() => router.back()}>
                                Cancel
                            </OrbisButton>
                            <OrbisButton type="submit">Send Invite</OrbisButton>
                        </Flex>
                    </Grid>
                </form>
            )}
        </>
    );
}
