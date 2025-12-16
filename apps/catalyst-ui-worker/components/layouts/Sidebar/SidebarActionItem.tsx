'use client';
import { Box, Icon, Text } from '@chakra-ui/react';
import { ElementType } from 'react';

type SidebarActionItemProps = {
    label: string;
    icon?: ElementType;
    onClick: () => void;
    isCollapsed: boolean;
};

export function SidebarActionItem({ label, icon: IconComponent, onClick, isCollapsed }: SidebarActionItemProps) {
    return (
        <Box
            px={isCollapsed ? 2 : 4}
            py={2}
            borderRadius="md"
            bg="transparent"
            color="var(--color-content-80)"
            fontWeight="400"
            _hover={{
                bg: 'var(--color-content-10)',
            }}
            transition="all 0.2s"
            display="flex"
            alignItems="center"
            justifyContent={isCollapsed ? 'center' : 'flex-start'}
            gap={3}
            cursor="pointer"
            onClick={onClick}
            title={isCollapsed ? label : undefined}
        >
            {IconComponent && <Icon as={IconComponent} w={5} h={5} />}
            {!isCollapsed && <Text>{label}</Text>}
        </Box>
    );
}
