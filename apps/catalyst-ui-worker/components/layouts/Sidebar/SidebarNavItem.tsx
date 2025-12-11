'use client';
import { Box, Icon, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { ElementType } from 'react';

type SidebarNavItemProps = {
    path: string;
    label: string;
    icon?: ElementType;
    isActive: boolean;
    isCollapsed: boolean;
};

export function SidebarNavItem({ path, label, icon: IconComponent, isActive, isCollapsed }: SidebarNavItemProps) {
    return (
        <Link href={path} style={{ textDecoration: 'none', width: '100%' }}>
            <Box
                px={isCollapsed ? 2 : 4}
                py={2}
                borderRadius="md"
                bg={isActive ? 'var(--color-primary-0)' : 'transparent'}
                color={isActive ? 'var(--color-primary-80)' : 'var(--color-content-80)'}
                fontWeight={isActive ? '600' : '400'}
                _hover={{
                    bg: isActive ? 'var(--color-primary-10)' : 'var(--color-content-10)',
                }}
                transition="all 0.2s"
                display="flex"
                alignItems="center"
                justifyContent={isCollapsed ? 'center' : 'flex-start'}
                gap={3}
            >
                {IconComponent && <Icon as={IconComponent} w={5} h={5} />}
                {!isCollapsed && <Text>{label}</Text>}
            </Box>
        </Link>
    );
}
