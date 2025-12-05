'use client';
import { Button, ButtonProps } from '@chakra-ui/button';
import { Flex } from '@chakra-ui/layout';
import { Avatar, AvatarProps, Icon, Menu, MenuButton, MenuItem, MenuList, Tooltip, Text } from '@chakra-ui/react';
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon,
    CheckCircleIcon,
    DocumentDuplicateIcon,
    EyeIcon,
    EyeSlashIcon,
    PencilSquareIcon,
    PlusIcon,
    QuestionMarkCircleIcon,
    ShareIcon,
    TrashIcon,
    XMarkIcon,
} from '@heroicons/react/20/solid';
import { MouseEventHandler, useState } from 'react';

export const OrbisButton = (props: ButtonProps) => {
    return <Button colorScheme="blue" borderRadius={5} size={'sm'} {...props} />;
};

export const DangerButton = (props: ButtonProps) => {
    return <Button colorScheme="red" borderRadius={5} size={'sm'} {...props} />;
};

export const WarningButton = (props: ButtonProps) => {
    return <Button colorScheme="yellow" borderRadius={5} size={'sm'} {...props} />;
};

export const BackButton = (props: ButtonProps) => {
    return (
        <Button
            onClick={() => (typeof window !== 'undefined' ? window.history.back() : null)}
            colorScheme="blue"
            borderRadius={'100%'}
            cursor={'pointer'}
            size={'sm'}
            {...props}
            padding={'.5em'}
        >
            <Icon as={ArrowLeftIcon} />
        </Button>
    );
};
export const HelpButton = (props: ButtonProps) => {
    return (
        <Button
            colorScheme="blue"
            variant={'ghost'}
            borderRadius={'100%'}
            cursor={'pointer'}
            size={'sm'}
            {...props}
            padding={'.1em'}
        >
            <Icon w={'20px !important'} h={'20px !important'} as={QuestionMarkCircleIcon} />
        </Button>
    );
};

export type ProfileButtonProps = {
    avatarProps?: AvatarProps;
    actions?: {
        displayName: string;
        action: MouseEventHandler<HTMLButtonElement>;
    }[];
    userInfo?: {
        userEmail: string;
        organization: string;
    };
};

export const ProfileButton = (props: ProfileButtonProps) => {
    return (
        <Flex data-testid="navbar-profile-button">
            {props.userInfo && (
                <Flex flexDirection="column" pr="8px" textAlign={'right'}>
                    <Text fontSize="sm" fontWeight="bold" data-testid="navbar-user-org-name">
                        {props.userInfo.organization}
                    </Text>
                    <Text fontSize="sm" data-testid="navbar-user-email-display">
                        {props.userInfo.userEmail.split('@')[0]}
                    </Text>
                </Flex>
            )}
            <Menu>
                <MenuButton>
                    <Avatar
                        {...props.avatarProps}
                        // as={Button}
                        bg="gray.700"
                        textColor={'white'}
                    />
                </MenuButton>
                <MenuList px={2}>
                    {props.actions?.map((action, index) => (
                        <MenuItem key={index} onClick={action.action}>
                            {action.displayName}
                        </MenuItem>
                    ))}
                    <MenuItem
                        onClick={() => {
                            if (typeof window !== 'undefined') {
                                window.location.href = '/cdn-cgi/auth/logout';
                            }
                        }}
                    >
                        Logout
                    </MenuItem>
                </MenuList>
            </Menu>
        </Flex>
    );
};
export const SaveButton = (props: ButtonProps) => {
    return (
        <Button colorScheme="blue" borderRadius={'100%'} cursor={'pointer'} size={'sm'} {...props} padding={'.5em'}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4 5C4 4.44772 4.44772 4 5 4H7V7C7 7.55228 7.44772 8 8 8H15C15.5523 8 16 7.55228 16 7V4H16.1716C16.4368 4 16.6911 4.10536 16.8787 4.29289L19.7071 7.12132C19.8946 7.30886 20 7.56321 20 7.82843V19C20 19.5523 19.5523 20 19 20H18V13C18 12.4477 17.5523 12 17 12H7C6.44772 12 6 12.4477 6 13V20H5C4.44772 20 4 19.5523 4 19V5ZM8 20H16V14H8V20ZM14 4H9V6H14V4ZM5 2C3.34315 2 2 3.34315 2 5V19C2 20.6569 3.34315 22 5 22H19C20.6569 22 22 20.6569 22 19V7.82843C22 7.03278 21.6839 6.26972 21.1213 5.70711L18.2929 2.87868C17.7303 2.31607 16.9672 2 16.1716 2H5Z"
                    fill="currentColor"
                />
            </svg>
        </Button>
    );
};

export const TrashButton = (props: ButtonProps) => {
    return (
        <Button colorScheme="red" borderRadius={'100%'} size={'sm'} {...props} padding={'.5em'}>
            <Icon as={TrashIcon} />
        </Button>
    );
};

export const CreateButton = (props: ButtonProps) => {
    return (
        <Button colorScheme="blue" borderRadius={'100%'} size={'sm'} {...props} padding={'.5em'}>
            <Icon as={PlusIcon} />
        </Button>
    );
};

export const CopyButton = (props: ButtonProps & { copytext?: string }) => {
    const [copied, setCopied] = useState(false);
    return (
        <Tooltip hasArrow placement="top" label={!copied ? 'Copy Text' : 'Copied!'}>
            <Button
                onClick={() => {
                    setTimeout(() => {
                        setCopied(false);
                    }, 1000);
                    setCopied(true);
                    navigator.clipboard.writeText(props.copytext ?? '');
                }}
                colorScheme="blue"
                borderRadius={'100%'}
                size={'sm'}
                {...props}
                padding={'.5em'}
            >
                {!copied ? (
                    <Icon as={DocumentDuplicateIcon} />
                ) : (
                    <Icon as={CheckCircleIcon} display={copied ? 'block' : 'none'} />
                )}
            </Button>
        </Tooltip>
    );
};

export const GenerateButton = (props: ButtonProps) => {
    return (
        <Button colorScheme="blue" borderRadius={'100%'} size={'sm'} {...props} padding={'.5em'}>
            <Icon as={ArrowPathIcon} />
        </Button>
    );
};

export const DisplayButton = (props: ButtonProps & { visible: boolean; toggletext: () => void }) => {
    const { visible, toggletext, ...rest } = props;
    const [visibleStatus, setVisible] = useState(visible);
    function onCLick() {
        setVisible(prev => !prev);
        toggletext();
    }
    return (
        <Button colorScheme="blue" borderRadius={'100%'} size={'sm'} {...rest} padding={'.5em'} onClick={onCLick}>
            {visibleStatus ? <Icon as={EyeIcon} /> : <Icon as={EyeSlashIcon} />}
        </Button>
    );
};

export const ShareButton = (props: ButtonProps) => {
    return (
        <Button colorScheme="blue" borderRadius={'100%'} size={'sm'} {...props} padding={'.5em'}>
            <Icon as={ShareIcon} />
        </Button>
    );
};

export const CloseButton = (props: ButtonProps) => {
    return (
        <Button colorScheme="gray" color={'GrayText'} borderRadius={'100%'} size={'sm'} {...props} padding={'.5em'}>
            <Icon as={XMarkIcon} />
        </Button>
    );
};

export const EditButton = (props: ButtonProps) => {
    return (
        <Button colorScheme="blue" borderRadius={'100%'} size={'sm'} {...props} padding={'.5em'}>
            <Icon as={PencilSquareIcon} />
        </Button>
    );
};

export const OpenButton = (props: ButtonProps) => {
    return (
        <Button
            rounded={'none'}
            variant={'ghost'}
            colorScheme="blue"
            {...props}
            padding={'.5em'}
            size={'sm'}
            display={'flex'}
            alignItems={'center'}
            justifyContent={'center'}
            gap={2}
        >
            <Icon as={ArrowTopRightOnSquareIcon} />
            {props.children}
        </Button>
    );
};

export const NeutralButton = (props: ButtonProps) => {
    return <Button colorScheme="gray" borderRadius={5} size={'sm'} {...props} />;
};
