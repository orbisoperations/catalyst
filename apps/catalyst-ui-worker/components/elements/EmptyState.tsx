'use client';
import { Button, Flex, Icon, Text, VStack } from '@chakra-ui/react';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ReactNode } from 'react';

// Design tokens
const ICON_COLOR = '#0B3481';
const BUTTON_BG = '#4168B1';
const BUTTON_TEXT = 'white';
const BORDER_COLOR = '#D8E2EF'; // Accent Light Stroke Medium

export interface EmptyStateProps {
    icon: ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    'data-testid'?: string;
}

export const EmptyState = ({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    'data-testid': dataTestId,
}: EmptyStateProps) => {
    return (
        <VStack
            spacing={4}
            py={16}
            px={8}
            align="center"
            justify="center"
            border="1px dashed"
            borderColor={BORDER_COLOR}
            borderRadius="md"
            bg="white"
            data-testid={dataTestId}
        >
            <Flex align="center" justify="center" color={ICON_COLOR}>
                {icon}
            </Flex>
            <Text fontSize="xl" fontWeight="bold" color="gray.800" textAlign="center">
                {title}
            </Text>
            <Text fontSize="sm" color="gray.500" textAlign="center" maxW="400px">
                {description}
            </Text>
            {actionLabel && onAction && (
                <Button
                    bg={BUTTON_BG}
                    color={BUTTON_TEXT}
                    _hover={{ bg: '#365a9e' }}
                    borderRadius="md"
                    px={6}
                    py={2}
                    onClick={onAction}
                >
                    {actionLabel}
                </Button>
            )}
        </VStack>
    );
};

export interface NoChannelsStateProps {
    onCreateChannel: () => void;
}

export const NoChannelsState = ({ onCreateChannel }: NoChannelsStateProps) => {
    return (
        <EmptyState
            icon={<Icon as={PlusIcon} boxSize={10} strokeWidth={2} />}
            title="No Data channels"
            description="Create your first data channel or gain partners to start using Catalyst"
            actionLabel="Create Data channel"
            onAction={onCreateChannel}
            data-testid="channels-empty-state"
        />
    );
};

export interface ChannelNotFoundStateProps {
    searchTerm?: string;
    onClearSearch: () => void;
}

export const ChannelNotFoundState = ({ searchTerm, onClearSearch }: ChannelNotFoundStateProps) => {
    const description = searchTerm
        ? `Your search for "${searchTerm}" did not return any results.`
        : 'Your search did not return any results.';

    return (
        <EmptyState
            icon={<Icon as={MagnifyingGlassIcon} boxSize={10} strokeWidth={2} />}
            title="Data channel not found"
            description={description}
            actionLabel="Clear Search"
            onAction={onClearSearch}
            data-testid="channels-not-found-state"
        />
    );
};
