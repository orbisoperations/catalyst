'use client';
import { useUser } from '@/components/contexts/User/UserContext';
import { ErrorCard, OrbisButton } from '@/components/elements';
import { DetailedView } from '@/components/layouts';
import { navigationItems } from '@/utils/nav.utils';
import { DataChannel, DataChannelActionResponse } from '@catalyst/schemas';
import { Flex, Grid } from '@chakra-ui/layout';
import { Card, CardBody, FormControl, Input, FormErrorMessage, FormLabel } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type DataChannelFormProps = {
    createDataChannel: (fd: FormData, token: string) => Promise<DataChannelActionResponse>;
};

export default function CreateChannelForm({ createDataChannel }: DataChannelFormProps) {
    const router = useRouter();
    const [hasError, setHasError] = useState<boolean>(false);
    const { user, token } = useUser();
    const [dataChannel, setDataChannel] = useState<Omit<DataChannel, 'id'>>({
        name: '',
        description: '',
        endpoint: '',
        creatorOrganization: String(user?.custom.org),
        accessSwitch: true,
    });

    // Validation state - only set on API error
    const [nameError, setNameError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    return (
        <DetailedView
            actions={<></>}
            headerTitle={{
                text: 'Create Data Channel',
            }}
            topbaractions={navigationItems}
            showspinner={false}
            topbartitle="Catalyst"
        >
            {hasError ? (
                <ErrorCard
                    title="Error"
                    message="An error occurred while creating the channel. Please try again later."
                    goBack={router.back}
                    retry={() => {
                        setHasError(false);
                    }}
                />
            ) : (
                <Card>
                    <CardBody>
                        <form
                            action={async (fd) => {
                                setIsSubmitting(true);
                                setNameError(''); // Clear previous errors
                                fd.set('organization', String(user?.custom.org));
                                createDataChannel(fd, token ?? '')
                                    .then((result) => {
                                        if (result.success) {
                                            // Handle array response - get first channel if array, otherwise use directly
                                            const channel = Array.isArray(result.data) ? result.data[0] : result.data;
                                            router.push('/channels/' + channel.id);
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
                                                setHasError(true);
                                            }
                                        }
                                    })
                                    .catch((e) => {
                                        // Only catch unexpected errors (should not happen with result pattern)
                                        console.error('Unexpected error:', e);
                                        setHasError(true);
                                    })
                                    .finally(() => {
                                        setIsSubmitting(false);
                                    });
                            }}
                        >
                            <Grid gap={5}>
                                <FormControl display={'grid'} gap={2} isInvalid={!!nameError}>
                                    <FormLabel htmlFor="name">Data Channel Name</FormLabel>
                                    <Input
                                        rounded="md"
                                        value={dataChannel.name}
                                        onChange={(e) => {
                                            setDataChannel({
                                                ...dataChannel,
                                                name: e.target.value,
                                            });
                                        }}
                                        name="name"
                                        required={true}
                                        placeholder="Data Channel Name"
                                        maxLength={64}
                                        isDisabled={isSubmitting}
                                    />
                                    {nameError && <FormErrorMessage>{nameError}</FormErrorMessage>}
                                </FormControl>
                                <FormControl display={'grid'} gap={2}>
                                    <label htmlFor="description">Description</label>
                                    <Input
                                        rounded="md"
                                        value={dataChannel.description}
                                        onChange={(e) => {
                                            setDataChannel({
                                                ...dataChannel,
                                                description: e.target.value,
                                            });
                                        }}
                                        name="description"
                                        required={true}
                                        placeholder="Description"
                                    />
                                </FormControl>
                                <FormControl display={'grid'} gap={2}>
                                    <label htmlFor="endpoint">Endpoint URL</label>
                                    <Input
                                        rounded="md"
                                        name="endpoint"
                                        value={dataChannel.endpoint}
                                        onChange={(e) => {
                                            setDataChannel({
                                                ...dataChannel,
                                                endpoint: e.target.value,
                                            });
                                        }}
                                        required={true}
                                        placeholder="Endpoint URL"
                                    />
                                </FormControl>
                                <Flex justifyContent={'space-between'}>
                                    <OrbisButton colorScheme="gray" onClick={router.back} isDisabled={isSubmitting}>
                                        Cancel
                                    </OrbisButton>
                                    <OrbisButton type="submit" isLoading={isSubmitting} loadingText="Creating...">
                                        Create
                                    </OrbisButton>
                                </Flex>
                            </Grid>
                        </form>
                    </CardBody>
                </Card>
            )}
        </DetailedView>
    );
}
