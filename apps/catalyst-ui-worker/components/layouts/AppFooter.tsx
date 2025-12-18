'use client';
import { Box, Flex, Text } from '@chakra-ui/react';
import Link from 'next/link';

type AppFooterProps = {
    onFeedbackClick: () => void;
};

export function AppFooter({ onFeedbackClick }: AppFooterProps) {
    return (
        <Box
            bg="var(--color-white)"
            borderTop="1px solid"
            borderColor="var(--color-content-30)"
            px={10}
            py={6}
            position="sticky"
            bottom={0}
            zIndex={10}
        >
            <Flex justifyContent="space-between" alignItems="center">
                <Text fontSize="sm" color="var(--color-content-50)">
                    © 2025 Orbis Operations. All Rights Reserved.
                </Text>
                <Flex gap={6} alignItems="center">
                    <Link href="/license" style={{ textDecoration: 'none' }}>
                        <Text fontSize="sm" color="var(--color-primary-80)" _hover={{ textDecoration: 'underline' }}>
                            License
                        </Text>
                    </Link>
                    <Link href="/terms" style={{ textDecoration: 'none' }}>
                        <Text fontSize="sm" color="var(--color-primary-80)" _hover={{ textDecoration: 'underline' }}>
                            Terms of Use
                        </Text>
                    </Link>
                    <Link href="/privacy" style={{ textDecoration: 'none' }}>
                        <Text fontSize="sm" color="var(--color-primary-80)" _hover={{ textDecoration: 'underline' }}>
                            Privacy Policy
                        </Text>
                    </Link>
                    <Text
                        fontSize="sm"
                        color="var(--color-primary-80)"
                        cursor="pointer"
                        onClick={onFeedbackClick}
                        _hover={{ textDecoration: 'underline' }}
                    >
                        Provide Feedback
                    </Text>
                </Flex>
            </Flex>
        </Box>
    );
}
