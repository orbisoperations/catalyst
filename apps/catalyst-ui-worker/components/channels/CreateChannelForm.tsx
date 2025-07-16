'use client';
import { useUser } from '@/components/contexts/User/UserContext';
import { ErrorCard, OrbisButton } from '@/components/elements';
import { DetailedView } from '@/components/layouts';
import { navigationItems } from '@/utils/nav.utils';
import { DataChannel } from '@catalyst/schema_zod';
import { Flex, Grid } from '@chakra-ui/layout';
import { Card, CardBody, FormControl, Input, InputGroup, InputLeftAddon } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type DataChannelFormProps = {
    createDataChannel: (fd: FormData, token: string) => Promise<DataChannel>;
};

export default function CreateChannelForm({ createDataChannel }: DataChannelFormProps) {
    const router = useRouter();
    const [hasError, setHasError] = useState<boolean>(false);
    const { user, token } = useUser();
    const [dataChannel, setDataChannel] = useState<Omit<DataChannel, 'id'>>({
        name: '',
        description: '',
        endpoint: '',
        creatorOrganization: user?.custom.org,
        accessSwitch: true,
    });
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
                                fd.set('organization', user?.custom.org);
                                fd.set('name', user?.custom.org + '/' + fd.get('name'));
                                createDataChannel(fd, token ?? '')
                                    .then((newChannel) => {
                                        router.push('/channels/' + newChannel.id);
                                    })
                                    .catch((e) => {
                                        console.error(e);
                                        setHasError(true);
                                    });
                            }}
                        >
                            <Grid gap={5}>
                                <FormControl display={'grid'} gap={2}>
                                    <label htmlFor="name">Data Channel Name</label>
                                    <InputGroup>
                                        <InputLeftAddon>{user?.custom.org}/</InputLeftAddon>

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
                                        />
                                    </InputGroup>
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
                                    <OrbisButton colorScheme="gray" onClick={router.back}>
                                        Cancel
                                    </OrbisButton>
                                    <OrbisButton type="submit">Create</OrbisButton>
                                </Flex>
                            </Grid>
                        </form>
                    </CardBody>
                </Card>
            )}
        </DetailedView>
    );
}
