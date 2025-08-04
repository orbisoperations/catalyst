'use client';
import { rotateJWTKeyMaterial } from '@/app/actions/tokens';
import { CreateButton, ErrorCard, OpenButton, OrbisButton, OrbisCard, OrbisTable } from '@/components/elements';
import { ListView } from '@/components/layouts';
import { navigationItems } from '@/utils/nav.utils';
import { IssuedJWTRegistry } from '@catalyst/schema_zod';
import { Box, Flex } from '@chakra-ui/layout';
import {
    Card,
    CardBody,
    Text,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    IconButton,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Spinner,
    useDisclosure,
} from '@chakra-ui/react';
import { EllipsisVerticalIcon, TrashIcon } from '@heroicons/react/20/solid';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '../contexts/User/UserContext';

type ListIssuedJWTRegistryProps = {
    listIJWTRegistry: (token: string) => Promise<IssuedJWTRegistry[]>;
    deleteIJWTRegistry: (token: string, id: string) => Promise<boolean>;
};

export default function APIKeysComponent({ listIJWTRegistry, deleteIJWTRegistry }: ListIssuedJWTRegistryProps) {
    const router = useRouter();
    const { user, token } = useUser();
    const [adminFlag, setAdminFlag] = useState<boolean>(false);
    const [hasError, setHasError] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [issuedJWTRegistry, setIssuedJWTRegistry] = useState<IssuedJWTRegistry[] | null>(null);
    const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    function fetchIssuedJWTRegistry() {
        setHasError(false);
        setIsLoading(true);
        if (user !== undefined && token !== undefined) {
            setAdminFlag(!!user?.custom.isPlatformAdmin);
            listIJWTRegistry(token)
                .then((data) => {
                    setIsLoading(false);
                    setIssuedJWTRegistry(data as IssuedJWTRegistry[]);
                })
                .catch((e) => {
                    setIsLoading(false);
                    setHasError(true);
                    setErrorMessage('An error occurred while fetching the tokens. Please try again later.');
                    console.error(e);
                });
        } else {
            setIsLoading(false);
            setAdminFlag(false);
        }
    }

    function handleDeleteToken(tokenId: string) {
        setTokenToDelete(tokenId);
        onOpen();
    }

    function confirmDeleteToken() {
        if (!token || !tokenToDelete) return;

        deleteIJWTRegistry(token, tokenToDelete)
            .then(() => {
                onClose();
                setTokenToDelete(null);
                fetchIssuedJWTRegistry();
            })
            .catch((error) => {
                console.error('Failed to delete token:', error);
                onClose();
                setTokenToDelete(null);
                setHasError(true);
                setErrorMessage('An error occurred while deleting the token. Please try again later.');
            });
    }

    useEffect(fetchIssuedJWTRegistry, [user, token]);

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Are you sure you want to delete this API key?</ModalHeader>
                    <ModalBody>
                        <Text>Deleting this API key will revoke access for any applications using it</Text>
                    </ModalBody>
                    <ModalFooter>
                        <Flex gap={5}>
                            <OrbisButton colorScheme="gray" onClick={onClose}>
                                Cancel
                            </OrbisButton>
                            <OrbisButton colorScheme="red" onClick={confirmDeleteToken}>
                                Delete
                            </OrbisButton>
                        </Flex>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <ListView
                actions={
                    !hasError ? (
                        <Flex gap={5}>
                            <CreateButton
                                onClick={() => {
                                    router.push('/tokens/create');
                                }}
                            />
                        </Flex>
                    ) : undefined
                }
                topbaractions={navigationItems}
                headerTitle={{
                    text: 'API Keys',
                }}
                positionChildren="top"
                topbartitle="API Keys"
                subtitle="Access Data through your own means"
                table={
                    hasError ? (
                        <ErrorCard title="Error" message={errorMessage} retry={fetchIssuedJWTRegistry} />
                    ) : (
                        <Box>
                            {adminFlag && (
                                <>
                                    <OrbisCard title="JWT Admin Pannel" mb={5}>
                                        <Text>JWT Admin Actions</Text>
                                        <OrbisButton
                                            onClick={async () => {
                                                if (!token) return;
                                                rotateJWTKeyMaterial(token)
                                                    .then((res) => {
                                                        console.log(res);
                                                    })
                                                    .catch((e) => {
                                                        setHasError(true);
                                                        setErrorMessage(
                                                            'An error occurred while rotating the key. Please try again later.'
                                                        );
                                                        console.error('error rotating keys: ', e);
                                                    });
                                            }}
                                        >
                                            Rotate JWT Signing Material
                                        </OrbisButton>
                                    </OrbisCard>
                                </>
                            )}
                            {isLoading || issuedJWTRegistry === null ? (
                                <Card sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <Spinner color="blue.500" sx={{ margin: '1em' }} />
                                </Card>
                            ) : issuedJWTRegistry.length > 0 ? (
                                <Card variant={'outline'} shadow={'md'}>
                                    <OrbisTable
                                        headers={['Name', 'Description', 'Expiration', 'Owner', '']}
                                        rows={issuedJWTRegistry.map(
                                            (
                                                jwt: {
                                                    id: string;
                                                    name: string;
                                                    description: string;
                                                    claims: string[];
                                                    expiry: Date;
                                                    organization: string;
                                                },
                                                index: number
                                            ) => {
                                                return [
                                                    <Flex key={jwt.id} justifyContent={'space-between'}>
                                                        <OpenButton onClick={() => router.push('/tokens/' + jwt.id)}>
                                                            {jwt.name}
                                                        </OpenButton>
                                                    </Flex>,
                                                    jwt.description,
                                                    jwt.expiry.toLocaleDateString(),
                                                    jwt.organization,
                                                    <Menu key={index + '-menu'}>
                                                        <MenuButton
                                                            as={IconButton}
                                                            icon={<EllipsisVerticalIcon width={16} height={16} />}
                                                            variant="ghost"
                                                            size="sm"
                                                            aria-label="Token options"
                                                        />
                                                        <MenuList>
                                                            <MenuItem
                                                                icon={<TrashIcon width={16} height={16} />}
                                                                color="red.500"
                                                                onClick={() => handleDeleteToken(jwt.id)}
                                                            >
                                                                Delete Token
                                                            </MenuItem>
                                                        </MenuList>
                                                    </Menu>,
                                                ];
                                            }
                                        )}
                                    />
                                </Card>
                            ) : (
                                <Card>
                                    <CardBody>
                                        No tokens exist for{' '}
                                        {user !== undefined ? (user.custom.org as string) : 'this user'}!
                                    </CardBody>
                                </Card>
                            )}
                        </Box>
                    )
                }
            ></ListView>
        </>
    );
}
