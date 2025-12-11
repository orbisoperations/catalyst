'use client';
import { Box, Flex, Text } from '@chakra-ui/react';

type SidebarSectionProps = {
    title: string;
    isCollapsed: boolean;
};

export function SidebarSection({ title, isCollapsed }: SidebarSectionProps) {
    if (isCollapsed) return null;

    return (
        <Box px={4} py={2}>
            <Flex alignItems="center" gap={2}>
                <Text fontSize="xs" fontWeight="semibold" color="var(--color-content-50)" letterSpacing="wide">
                    {title}
                </Text>
                <Box flex={1} height="1px" bg="var(--color-content-30)" />
            </Flex>
        </Box>
    );
}
