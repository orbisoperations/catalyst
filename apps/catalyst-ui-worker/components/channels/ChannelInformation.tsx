'use client';
import { Box, Flex, Text } from '@chakra-ui/layout';
import { Menu, MenuButton, MenuList, MenuItem, Button } from '@chakra-ui/react';
import { DataChannel } from '@catalyst/schemas';
import { PrimaryButton, Card } from '@orbisoperations/o2-ui';
import { PencilSquareIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

type ChannelInformationProps = {
    channel?: DataChannel;
    onEditClick: () => void;
};

type StatusOption = {
    value: string;
    label: string;
    icon: React.ReactNode;
    color: string;
};

const statusOptions: StatusOption[] = [
    {
        value: 'connected',
        label: 'Connected',
        icon: <CheckCircleIcon width={16} height={16} />,
        color: 'green.500',
    },
    {
        value: 'disabled',
        label: 'Disabled',
        icon: <XCircleIcon width={16} height={16} />,
        color: 'red.500',
    },
];

export default function ChannelInformation({ channel, onEditClick }: ChannelInformationProps) {
    const [selectedStatus, setSelectedStatus] = useState<string>('connected');

    if (!channel) {
        return null;
    }

    const currentOption = statusOptions.find((opt) => opt.value === selectedStatus) || statusOptions[0];

    return (
        <Card>
            <Box
                px={6}
                py={4}
                borderBottom="1px solid"
                borderColor="gray.200"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
            >
                <Text
                    style={{
                        color: '#0A0A0A',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '24px',
                        fontWeight: 700,
                        lineHeight: '32px',
                    }}
                >
                    {channel.name}
                </Text>
                <Flex alignItems="center" gap={3}>
                    <Menu>
                        <MenuButton
                            as={Button}
                            height="32px"
                            width="163px"
                            rightIcon={<ChevronDownIcon width={16} height={16} />}
                            borderColor="gray.300"
                            borderWidth="1px"
                            borderRadius="md"
                            bg="white"
                            fontSize="sm"
                            fontWeight="normal"
                            _hover={{ bg: 'gray.50' }}
                            _active={{ bg: 'gray.100' }}
                        >
                            <Flex alignItems="center" gap={2}>
                                <Box color={currentOption.color}>{currentOption.icon}</Box>
                                <Text fontSize="sm">{currentOption.label}</Text>
                            </Flex>
                        </MenuButton>
                        <MenuList minW="163px" borderRadius="md">
                            {statusOptions.map((option) => (
                                <MenuItem
                                    key={option.value}
                                    onClick={() => setSelectedStatus(option.value)}
                                    fontSize="sm"
                                >
                                    <Flex alignItems="center" gap={2}>
                                        <Box color={option.color}>{option.icon}</Box>
                                        <Text>{option.label}</Text>
                                    </Flex>
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                    <PrimaryButton
                        showIcon
                        icon={<PencilSquareIcon width={16} height={16} />}
                        onClick={onEditClick}
                        style={{ height: '32px' }}
                    >
                        Edit
                    </PrimaryButton>
                </Flex>
            </Box>
        </Card>
    );
}
