import { useUser } from '@/components/contexts/User/UserContext';
import { Box, Flex, Grid, PropsOf, Text, Image, Heading } from '@chakra-ui/react';
import { BackButton, OrbisButton, ProfileButton } from '../../elements';
import { useEffect, useState } from 'react';

type TopBarProps = PropsOf<typeof Box> & {
    title?: string;
    actions?: { display: string; path: string }[];
    activeIndex?: number;
    customActions?: JSX.Element;
};

export const TopBar = (props: TopBarProps) => {
    'use client';
    const { actions, customActions, ...boxProps } = props;
    const { user } = useUser();
    const [orgName, setOrgName] = useState<string>(
        typeof window !== 'undefined' ? (window.localStorage.getItem('org') ?? '') : ''
    );

    useEffect(() => {
        if (user) {
            if (typeof window !== 'undefined') window.localStorage.setItem('org', String(user.custom.org));
            setOrgName(String(user.custom.org));
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('org', String(user.custom.org));
            }
        }
    }, [user?.custom.org]);

    return (
        <Box position={'sticky'} top={0} bg={'white'} zIndex={10}>
            <Flex {...boxProps} shadow={'md'} padding={'1em'} justifyContent={'end'} alignItems={'center'} zIndex={10}>
                <Image src="/catalyst-logo.svg" w="140px" alt="Catalyst Logo" mr="auto" data-testid="navbar-logo" />
                {(actions || customActions) && (
                    <Flex gap={5} alignItems={'center'} pr="2%">
                        {actions &&
                            actions.map((action, index) => (
                                <a
                                    href={action.path}
                                    key={index}
                                    className=""
                                    data-testid={`navbar-${action.display.toLowerCase().replace(/\s+/g, '-')}-link`}
                                >
                                    <OrbisButton variant={'ghost'}>{action.display}</OrbisButton>
                                </a>
                            ))}
                        {customActions}
                    </Flex>
                )}
                <ProfileButton
                    avatarProps={{ name: user?.email ? user.email : 'User email' }}
                    userInfo={{
                        userEmail: user?.email ? user.email : '',
                        organization: orgName,
                    }}
                ></ProfileButton>
            </Flex>
        </Box>
    );
};

export const Footer = (props: PropsOf<typeof Box>) => {
    const { children, ...boxProps } = props;
    return (
        <Box {...boxProps} padding={'1em'} bg={'gray.50'} position={'sticky'} bottom={0} right={0} left={0}>
            <Flex>{children}</Flex>
        </Box>
    );
};

export const DetailedHeader = ({
    actions,
    title,
    subtitle,
}: {
    actions?: JSX.Element;
    subtitle?: string;
    title?: { text?: string; adjacent?: JSX.Element };
}) => {
    return (
        <Grid gap={2} position={'sticky'} top={0} bg={'white'} zIndex={5} pb={'1em'}>
            <Flex gap={5} justifyContent={'space-between'}>
                <Flex gap={5} alignItems={'center'} justifyContent={'flex-start'} flex={1}>
                    <Box>
                        <Flex gap={5} align={'center'}>
                            <Box>
                                <BackButton />
                            </Box>
                            {title && (
                                <Box>
                                    {title.text && (
                                        <Heading
                                            as="h1"
                                            fontSize={'2xl'}
                                            fontWeight={'bold'}
                                            color={'gray.800'}
                                            textTransform={'uppercase'}
                                        >
                                            {title.text}
                                        </Heading>
                                    )}
                                    {title.adjacent && <Box>{title.adjacent}</Box>}
                                </Box>
                            )}
                        </Flex>
                    </Box>
                </Flex>
                {actions && <Box>{actions}</Box>}
            </Flex>
            {subtitle && (
                <Text fontSize={'lg'} color={'gray.400'}>
                    {subtitle}
                </Text>
            )}
        </Grid>
    );
};

export const ListedHeader = ({
    actions,
    title,
    subtitle,
}: {
    actions?: JSX.Element;
    subtitle?: string;
    title?: { text?: string; adjacent?: JSX.Element };
}) => {
    return (
        <Grid gap={2} position={'sticky'} top={0} bg={'white'} zIndex={5} pb={'1em'}>
            <Flex gap={5} justifyContent={'space-between'}>
                <Flex gap={5} alignItems={'center'} justifyContent={'flex-start'} flex={1}>
                    {title && (
                        <Box>
                            <Flex gap={5} align={'center'}>
                                {title.text && (
                                    <Heading
                                        as="h1"
                                        fontSize={'2xl'}
                                        fontWeight={'bold'}
                                        color={'gray.800'}
                                        textTransform={'uppercase'}
                                    >
                                        {title.text}
                                    </Heading>
                                )}
                                {title.adjacent && <Box>{title.adjacent}</Box>}
                            </Flex>
                        </Box>
                    )}
                </Flex>
                {actions && <Box>{actions}</Box>}
            </Flex>
            {subtitle && (
                <Text fontSize={'lg'} color={'gray.400'}>
                    {subtitle}
                </Text>
            )}
        </Grid>
    );
};
