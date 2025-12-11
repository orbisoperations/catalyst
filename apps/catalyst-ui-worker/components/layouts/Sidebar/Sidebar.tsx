'use client';
import { Box, Flex, IconButton, Image } from '@chakra-ui/react';
import { Bars3Icon, TableCellsIcon, CodeBracketIcon, UsersIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ProfileButton } from '@/components/elements';
import { navigationItems } from '@/utils/nav.utils';
import { usePathname } from 'next/navigation';
import { SidebarNavItem } from './SidebarNavItem';
import { SidebarSection } from './SidebarSection';
import { SidebarActionItem } from './SidebarActionItem';

const NAV_ICONS: Record<string, typeof TableCellsIcon> = {
    '/channels': TableCellsIcon,
    '/tokens': CodeBracketIcon,
    '/partners': UsersIcon,
};

type SidebarProps = {
    isCollapsed: boolean;
    onToggle: () => void;
    user?: { email?: string; custom: { org?: string } };
    orgName: string;
    onCreateChannel: () => void;
    onNewPartnership: () => void;
    onCreateToken: () => void;
};

export function Sidebar({
    isCollapsed,
    onToggle,
    user,
    orgName,
    onCreateChannel,
    onNewPartnership,
    onCreateToken,
}: SidebarProps) {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    return (
        <Box
            width={isCollapsed ? '60px' : '280px'}
            bg="var(--color-white)"
            borderRight="1px solid"
            borderColor="var(--color-content-30)"
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
                justifyContent={isCollapsed ? 'center' : 'space-between'}
                minH="80px"
            >
                {!isCollapsed && <Image src="/catalyst-logo.svg" w="140px" alt="Catalyst Logo" />}
                <IconButton
                    aria-label="Toggle sidebar"
                    icon={<Bars3Icon width={20} height={20} />}
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                />
            </Box>

            <SidebarSection title="Pages" isCollapsed={isCollapsed} />

            {/* Navigation Items */}
            <Box p={4}>
                <Flex flexDirection="column" gap={2}>
                    {navigationItems.map((item) => (
                        <SidebarNavItem
                            key={item.path}
                            path={item.path}
                            label={item.display}
                            icon={NAV_ICONS[item.path]}
                            isActive={isActive(item.path)}
                            isCollapsed={isCollapsed}
                        />
                    ))}
                </Flex>
            </Box>

            <SidebarSection title="Account" isCollapsed={isCollapsed} />

            {/* Account Actions */}
            <Box p={isCollapsed ? 2 : 4} pt={isCollapsed ? 4 : 2}>
                <Flex flexDirection="column" gap={2}>
                    <SidebarActionItem
                        label="Create a channel"
                        icon={PlusIcon}
                        onClick={onCreateChannel}
                        isCollapsed={isCollapsed}
                    />
                    <SidebarActionItem
                        label="New partnership"
                        icon={UsersIcon}
                        onClick={onNewPartnership}
                        isCollapsed={isCollapsed}
                    />
                    <SidebarActionItem
                        label="Create a new API key"
                        icon={CodeBracketIcon}
                        onClick={onCreateToken}
                        isCollapsed={isCollapsed}
                    />
                </Flex>
            </Box>

            {/* Spacer */}
            <Box flex={1} />

            {/* Profile Section */}
            {!isCollapsed && (
                <Box p={4}>
                    <ProfileButton
                        avatarProps={{ name: user?.email || 'User email' }}
                        userInfo={{
                            userEmail: user?.email || '',
                            organization: orgName,
                        }}
                    />
                </Box>
            )}
        </Box>
    );
}
