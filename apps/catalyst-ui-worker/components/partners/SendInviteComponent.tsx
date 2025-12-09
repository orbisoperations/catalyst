'use client';

import { ErrorCard, OrbisButton } from '@/components/elements';
import { DetailedView } from '@/components/layouts';
import { navigationItems } from '@/utils/nav.utils';
import { Flex, FormControl, FormLabel, FormHelperText, Grid, Input, Text, Textarea } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useUser } from '../contexts/User/UserContext';
import { OrgIdSchema } from '@catalyst/schemas';
import { SendInviteResult } from '@/app/actions/partners';

type CreateInviteProps = {
    sendInvite: (receivingOrg: string, token: string, message: string) => Promise<SendInviteResult>;
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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const submittingRef = useRef(false);

    const hasOrgError = errorMessage !== null;

    // Real-time validation as user types
    useEffect(() => {
        // Don't show error for empty field (let required handle that on submit)
        if (inviteState.org === '') {
            setErrorMessage(null);
            return;
        }

        // Validate format
        const result = OrgIdSchema.safeParse(inviteState.org);
        if (!result.success) {
            setErrorMessage(result.error.issues[0]?.message ?? 'Invalid organization ID');
            return;
        }

        // Check self-invite
        if (user?.custom?.org && inviteState.org === user.custom.org) {
            setErrorMessage('You cannot invite your own organization');
            return;
        }

        setErrorMessage(null);
    }, [inviteState.org, user?.custom?.org]);

    return (
        <DetailedView
            topbartitle="Invite Partner"
            topbaractions={navigationItems}
            showspinner={false}
            subtitle="Invite a partner to start sharing data."
            headerTitle={{ text: 'Invite Partner' }}
        >
            {hasError ? (
                <ErrorCard
                    title="Error"
                    message="An error occurred while sending the invite. Please try again later."
                    retry={() => {
                        setHasError(false);
                        setErrorMessage(null);
                    }}
                />
            ) : (
                <form
                    aria-label="Send partner invitation form"
                    action={async (formData) => {
                        // Prevent double-submission with ref guard
                        if (submittingRef.current) return;
                        submittingRef.current = true;
                        setIsSubmitting(true);
                        setErrorMessage(null);

                        try {
                            // Validate that user organization exists
                            if (!user?.custom?.org) {
                                setErrorMessage('Unable to determine your organization. Please refresh the page.');
                                return;
                            }

                            // Validate that token exists
                            if (!token) {
                                setErrorMessage('Authentication token is missing. Please refresh the page.');
                                return;
                            }

                            // Safe formData handling
                            const orgRaw = formData.get('orgId');
                            const messageRaw = formData.get('message');

                            if (typeof orgRaw !== 'string' || orgRaw === '') {
                                setErrorMessage('Organization ID is required');
                                return;
                            }
                            const org = orgRaw;
                            const message = typeof messageRaw === 'string' ? messageRaw : '';

                            // Validate org ID format using schema
                            const parseResult = OrgIdSchema.safeParse(org);
                            if (!parseResult.success) {
                                setErrorMessage(parseResult.error.issues[0]?.message ?? 'Invalid organization ID');
                                return;
                            }

                            if (org === user.custom.org) {
                                setErrorMessage('You cannot invite your own organization');
                                return;
                            }

                            const result = await sendInvite(
                                org,
                                token,
                                message.trim() === '' ? `${user.custom.org} invited you to partner with them` : message
                            );

                            if (!result.success) {
                                // Handle specific duplicate invite errors with inline message
                                const errorMsg = result.error.toLowerCase();
                                console.error('SendInvite error:', result.error);

                                // Check for duplicate invite errors - differentiate between directions
                                // "pending invite to this organization" = you already sent one
                                // "pending invite from this organization" = they already sent you one (bidirectional block)
                                if (errorMsg.includes('pending invite to')) {
                                    setErrorMessage('You already have a pending invite to this organization.');
                                } else if (errorMsg.includes('pending invite from')) {
                                    setErrorMessage('This organization already has a pending invite to you.');
                                } else if (errorMsg.includes('pending invite') || errorMsg.includes('already exists')) {
                                    // Fallback for any other duplicate-related errors
                                    setErrorMessage('A partnership invite already exists with this organization.');
                                } else {
                                    // Show generic error card for other failures
                                    setHasError(true);
                                }
                            } else {
                                router.back();
                            }
                        } catch (error) {
                            // Catch unexpected errors (network issues, etc.)
                            console.error('SendInvite unexpected error:', error);
                            setHasError(true);
                        } finally {
                            submittingRef.current = false;
                            setIsSubmitting(false);
                        }
                    }}
                >
                    <Grid gap={5} role="group" aria-label="Invitation details">
                        <FormControl isRequired isInvalid={hasOrgError}>
                            <FormLabel htmlFor="orgId">Organization ID</FormLabel>
                            <Input
                                id="orgId"
                                data-testid="invite-org-id-input"
                                required
                                rounded={'md'}
                                name="orgId"
                                value={inviteState.org}
                                aria-describedby={hasOrgError ? 'orgId-error' : 'orgId-help'}
                                isDisabled={isSubmitting}
                                onChange={(e) => {
                                    setInviteState({
                                        ...inviteState,
                                        org: e.target.value,
                                    });
                                }}
                                type="text"
                            />
                            {hasOrgError ? (
                                <Text
                                    id="orgId-error"
                                    data-testid="invite-error-message"
                                    role="alert"
                                    aria-live="polite"
                                    color={'red'}
                                    fontSize={'sm'}
                                    mt={'1em'}
                                    fontWeight={'semibold'}
                                    textAlign={'center'}
                                >
                                    {errorMessage}
                                </Text>
                            ) : (
                                <FormHelperText id="orgId-help">
                                    Enter the ID of the organization you want to partner with
                                </FormHelperText>
                            )}
                        </FormControl>
                        <FormControl>
                            <FormLabel htmlFor="message">Invite Message</FormLabel>
                            <Textarea
                                id="message"
                                data-testid="invite-message-input"
                                name="message"
                                value={inviteState.message}
                                aria-label="Optional invitation message"
                                aria-describedby="message-help"
                                isDisabled={isSubmitting}
                                onChange={(e) => {
                                    setInviteState({
                                        ...inviteState,
                                        message: e.target.value,
                                    });
                                }}
                            />
                            <FormHelperText id="message-help">
                                Optional message to include with the invitation
                            </FormHelperText>
                        </FormControl>
                        <Flex justify={'space-between'} role="group" aria-label="Form actions">
                            <OrbisButton
                                data-testid="invite-cancel-button"
                                colorScheme="gray"
                                onClick={() => router.back()}
                                aria-label="Cancel and go back"
                                isDisabled={isSubmitting}
                            >
                                Cancel
                            </OrbisButton>
                            <OrbisButton
                                data-testid="invite-send-button"
                                type="submit"
                                aria-label="Send partnership invitation"
                                isLoading={isSubmitting}
                                isDisabled={hasOrgError || inviteState.org === ''}
                                loadingText="Sending..."
                            >
                                Send Invite
                            </OrbisButton>
                        </Flex>
                    </Grid>
                </form>
            )}
        </DetailedView>
    );
}
