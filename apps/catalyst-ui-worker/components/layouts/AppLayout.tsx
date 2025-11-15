'use client';
import { useUser } from '@/components/contexts/User/UserContext';
import { ProfileButton } from '@/components/elements';
import { navigationItems } from '@/utils/nav.utils';
import { Box, Flex, Text, Image, IconButton, Icon } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '@orbisoperations/o2-ui';
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
import { 
    Bars3Icon,
    TableCellsIcon,
    CodeBracketIcon,
    UsersIcon,
    PlusIcon,
    UserPlusIcon,
    KeyIcon
} from '@heroicons/react/24/outline';

type AppLayoutProps = {
    children: React.ReactNode;
};

function generateBreadcrumbs(pathname: string): { label: string; href: string }[] {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: { label: string; href: string }[] = [
        { label: 'Home', href: '/' },
    ];

    let currentPath = '';
    segments.forEach((segment) => {
        currentPath += `/${segment}`;
        // Format segment name (e.g., "channels" -> "Channels", "api-keys" -> "API Keys")
        const label = segment
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        breadcrumbs.push({ label, href: currentPath });
    });

    return breadcrumbs;
}

export function AppLayout({ children }: AppLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const [orgName, setOrgName] = useState<string>(
        typeof window !== 'undefined' ? (window.localStorage.getItem('org') ?? '') : ''
    );
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const feedbackDisclosure = useDisclosure();

    useEffect(() => {
        if (user) {
            if (typeof window !== 'undefined') window.localStorage.setItem('org', String(user.custom.org));
            setOrgName(String(user.custom.org));
        }
    }, [user?.custom.org]);

    const breadcrumbs = generateBreadcrumbs(pathname);
    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    const handleFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        feedbackDisclosure.onClose();
    };

    return (
        <Flex height="100vh" overflow="hidden">
            {/* Left Sidebar */}
            <Box
                width={isSidebarCollapsed ? '60px' : '280px'}
                bg="white"
                borderRight="1px solid"
                borderColor="gray.200"
                display="flex"
                flexDirection="column"
                position="sticky"
                top={0}
                height="100vh"
                overflowY="auto"
                transition="width 0.3s ease"
                overflow="hidden"
            >
                {/* Logo */}
                <Box 
                    p={6} 
                    display="flex" 
                    alignItems="center" 
                    justifyContent={isSidebarCollapsed ? "center" : "space-between"}
                    minH="80px"
                >
                    {!isSidebarCollapsed && <Image src="/catalyst-logo.svg" w="140px" alt="Catalyst Logo" />}
                    <IconButton
                        aria-label="Toggle sidebar"
                        icon={<Bars3Icon width={20} height={20} />}
                        variant="ghost"
                        size="sm"
                        onClick={toggleSidebar}
                    />
                </Box>

                {/* Pages Section Header */}
                {!isSidebarCollapsed && (
                    <Box px={4} py={2}>
                        <Flex alignItems="center" gap={2}>
                            <Text fontSize="xs" fontWeight="semibold" color="gray.500" letterSpacing="wide">
                                Pages
                            </Text>
                            <Box flex={1} height="1px" bg="gray.200" />
                        </Flex>
                    </Box>
                )}

                {/* Navigation Items - Pages Section */}
                <Box p={4}>
                    <Flex flexDirection="column" gap={2}>
                        {navigationItems.map((item) => {
                            const active = isActive(item.path);
                            // Get icon based on path
                            let IconComponent;
                            if (item.path === '/channels') {
                                IconComponent = TableCellsIcon;
                            } else if (item.path === '/tokens') {
                                IconComponent = CodeBracketIcon;
                            } else if (item.path === '/partners') {
                                IconComponent = UsersIcon;
                            }

                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    style={{
                                        textDecoration: 'none',
                                        width: '100%',
                                    }}
                                >
                                    <Box
                                        px={isSidebarCollapsed ? 2 : 4}
                                        py={2}
                                        borderRadius="md"
                                        bg={active ? 'blue.50' : 'transparent'}
                                        color={active ? 'blue.700' : 'gray.700'}
                                        fontWeight={active ? '600' : '400'}
                                        _hover={{
                                            bg: active ? 'blue.100' : 'gray.100',
                                        }}
                                        transition="all 0.2s"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent={isSidebarCollapsed ? 'center' : 'flex-start'}
                                        gap={3}
                                    >
                                        {IconComponent && (
                                            <Icon as={IconComponent} w={5} h={5} />
                                        )}
                                        {!isSidebarCollapsed && <Text>{item.display}</Text>}
                                    </Box>
                                </Link>
                            );
                        })}
                    </Flex>
                </Box>

                {/* Account Section Header */}
                {!isSidebarCollapsed && (
                    <Box px={4} py={2}>
                        <Flex alignItems="center" gap={2}>
                            <Text fontSize="xs" fontWeight="semibold" color="gray.500" letterSpacing="wide">
                                Account
                            </Text>
                            <Box flex={1} height="1px" bg="gray.200" />
                        </Flex>
                    </Box>
                )}

                {/* Account Actions */}
                <Box p={isSidebarCollapsed ? 2 : 4} pt={isSidebarCollapsed ? 4 : 2}>
                    <Flex flexDirection="column" gap={2}>
                        <Box
                            px={isSidebarCollapsed ? 2 : 4}
                            py={2}
                            borderRadius="md"
                            bg="transparent"
                            color="gray.700"
                            fontWeight="400"
                            _hover={{
                                bg: 'gray.100',
                            }}
                            transition="all 0.2s"
                            display="flex"
                            alignItems="center"
                            justifyContent={isSidebarCollapsed ? 'center' : 'flex-start'}
                            gap={3}
                            cursor="pointer"
                            onClick={() => router.push('/channels/create')}
                            title={isSidebarCollapsed ? 'Create a channel' : undefined}
                        >
                            <Icon as={PlusIcon} w={5} h={5} />
                            {!isSidebarCollapsed && <Text>Create a channel</Text>}
                        </Box>
                        <Box
                            px={isSidebarCollapsed ? 2 : 4}
                            py={2}
                            borderRadius="md"
                            bg="transparent"
                            color="gray.700"
                            fontWeight="400"
                            _hover={{
                                bg: 'gray.100',
                            }}
                            transition="all 0.2s"
                            display="flex"
                            alignItems="center"
                            justifyContent={isSidebarCollapsed ? 'center' : 'flex-start'}
                            gap={3}
                            cursor="pointer"
                            onClick={() => router.push('/partners/invite')}
                            title={isSidebarCollapsed ? 'New partnership' : undefined}
                        >
                            <Icon as={UserPlusIcon} w={5} h={5} />
                            {!isSidebarCollapsed && <Text>New partnership</Text>}
                        </Box>
                        <Box
                            px={isSidebarCollapsed ? 2 : 4}
                            py={2}
                            borderRadius="md"
                            bg="transparent"
                            color="gray.700"
                            fontWeight="400"
                            _hover={{
                                bg: 'gray.100',
                            }}
                            transition="all 0.2s"
                            display="flex"
                            alignItems="center"
                            justifyContent={isSidebarCollapsed ? 'center' : 'flex-start'}
                            gap={3}
                            cursor="pointer"
                            onClick={() => router.push('/tokens/create')}
                            title={isSidebarCollapsed ? 'Create a new API key' : undefined}
                        >
                            <Icon as={KeyIcon} w={5} h={5} />
                            {!isSidebarCollapsed && <Text>Create a new API key</Text>}
                        </Box>
                    </Flex>
                </Box>

                {/* Spacer to push profile section to bottom */}
                <Box flex={1} />

                {/* Profile Section */}
                {!isSidebarCollapsed && (
                    <Box p={4}>
                        <ProfileButton
                            avatarProps={{ name: user?.email ? user.email : 'User email' }}
                            userInfo={{
                                userEmail: user?.email ? user.email : '',
                                organization: orgName,
                            }}
                        />
                    </Box>
                )}
            </Box>

            {/* Main Content Area */}
            <Flex flexDirection="column" flex={1} overflow="hidden">
                {/* Top Bar with Breadcrumbs */}
                <Box
                    bg="white"
                    borderBottom="1px solid"
                    borderColor="gray.200"
                    px={10}
                    py={3}
                    position="sticky"
                    top={0}
                    zIndex={10}
                >
                    <Flex justifyContent="space-between" alignItems="center">
                        <Breadcrumbs links={breadcrumbs} size="medium" />
                    </Flex>
                </Box>

                {/* Page Content */}
                <Box flex={1} overflowY="auto" bg="gray.50" p={8}>
                    {children}
                </Box>

                {/* Footer */}
                <Box
                    bg="white"
                    borderTop="1px solid"
                    borderColor="gray.200"
                    px={10}
                    py={6}
                    position="sticky"
                    bottom={0}
                    zIndex={10}
                >
                    <Flex justifyContent="space-between" alignItems="center">
                        <Text fontSize="sm" color="gray.600">
                            © 2025 Orbis Operations. All Rights Reserved.
                        </Text>
                        <Flex gap={6} alignItems="center">
                            <Link href="/license" style={{ textDecoration: 'none' }}>
                                <Text fontSize="sm" color="#3182ce" _hover={{ textDecoration: 'underline' }}>
                                    License
                                </Text>
                            </Link>
                            <Link href="/terms" style={{ textDecoration: 'none' }}>
                                <Text fontSize="sm" color="#3182ce" _hover={{ textDecoration: 'underline' }}>
                                    Terms of Use
                                </Text>
                            </Link>
                            <Link href="/privacy" style={{ textDecoration: 'none' }}>
                                <Text fontSize="sm" color="#3182ce" _hover={{ textDecoration: 'underline' }}>
                                    Privacy Policy
                                </Text>
                            </Link>
                            <Text
                                fontSize="sm"
                                color="#3182ce"
                                cursor="pointer"
                                onClick={feedbackDisclosure.onOpen}
                                _hover={{ textDecoration: 'underline' }}
                            >
                                Provide Feedback
                            </Text>
                        </Flex>
                    </Flex>
                </Box>
            </Flex>

            {/* Feedback Modal */}
            <Modal isOpen={feedbackDisclosure.isOpen} onClose={feedbackDisclosure.onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Feel free to reach out</ModalHeader>
                    <ModalCloseButton />
                    <form onSubmit={handleFeedbackSubmit}>
                        <ModalBody>
                            <Grid gap={5}>
                                <FormControl isRequired>
                                    <FormLabel>Email</FormLabel>
                                    <Input placeholder="Email" rounded={'md'} />
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
        </Flex>
    );
}

