'use client';
import { Box, Flex } from '@chakra-ui/react';
import { Breadcrumbs } from '@orbisoperations/o2-ui';

function generateBreadcrumbs(pathname: string): { label: string; href: string }[] {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: { label: string; href: string }[] = [{ label: 'Home', href: '/' }];

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

type AppTopBarProps = {
    pathname: string;
};

export function AppTopBar({ pathname }: AppTopBarProps) {
    const breadcrumbs = generateBreadcrumbs(pathname);

    return (
        <Box
            bg="var(--color-white)"
            borderBottom="1px solid"
            borderColor="var(--color-content-30)"
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
    );
}
