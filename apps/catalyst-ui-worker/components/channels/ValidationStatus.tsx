'use client';
import {
    Badge,
    Button,
    Spinner,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    HStack,
    Text,
} from '@chakra-ui/react';
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';
import { validateChannel } from '@/app/actions/validation';
import { DetailedValidationResult } from './DetailedValidationResult';
import type { ValidationResult, ValidationStatus } from '@catalyst/schemas';

interface ValidationStatusProps {
    channelId: string;
    endpoint: string;
    organizationId: string;
    lastValidation?: {
        status: 'valid' | 'invalid' | 'error';
        timestamp: number;
        error?: string;
    };
}

export function ValidationStatusBadge({ status }: { status?: ValidationStatus }) {
    if (!status) {
        return (
            <Badge colorScheme="gray" display="flex" alignItems="center" gap={1}>
                <ClockIcon width={12} height={12} />
                Never Validated
            </Badge>
        );
    }

    const configs = {
        valid: {
            color: 'green',
            icon: <CheckCircleIcon width={12} height={12} />,
            label: 'Valid',
        },
        invalid: {
            color: 'red',
            icon: <XCircleIcon width={12} height={12} />,
            label: 'Invalid',
        },
        error: {
            color: 'orange',
            icon: <ExclamationCircleIcon width={12} height={12} />,
            label: 'Error',
        },
        pending: {
            color: 'blue',
            icon: <Spinner size="xs" />,
            label: 'Validating',
        },
        unknown: {
            color: 'gray',
            icon: <ExclamationCircleIcon width={12} height={12} />,
            label: 'Unknown',
        },
    };

    const config = configs[status as keyof typeof configs];

    return (
        <Badge colorScheme={config.color} display="flex" alignItems="center" gap={1}>
            {config.icon}
            {config.label}
        </Badge>
    );
}

export function ValidationButton({
    channelId,
    endpoint,
    organizationId,
}: Omit<ValidationStatusProps, 'lastValidation'>) {
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const handleValidate = async () => {
        setIsValidating(true);
        setValidationResult(null);

        try {
            const result = await validateChannel(channelId, endpoint, organizationId);
            setValidationResult(result);

            // Open modal to show detailed results if validation failed
            if (result.status !== 'valid') {
                onOpen();
            }
        } catch (error) {
            console.error('Validation error:', error);
            setValidationResult({
                channelId,
                status: 'error',
                timestamp: Date.now(),
                error: 'Failed to run validation',
                details: {
                    endpoint,
                    organizationId,
                    duration: 0,
                    tests: [],
                },
            });
        } finally {
            setIsValidating(false);
        }
    };

    const getTestsSummary = () => {
        if (!validationResult?.details?.tests) return null;
        const passed = validationResult.details.tests.filter((t) => t.success).length;
        const total = validationResult.details.tests.length;
        return `${passed}/${total} tests`;
    };

    return (
        <>
            <HStack spacing={2}>
                {validationResult && (
                    <HStack spacing={2}>
                        <ValidationStatusBadge status={validationResult.status} />
                        {validationResult.details?.tests && validationResult.details.tests.length > 0 && (
                            <Text fontSize="xs" color="gray.600">
                                {getTestsSummary()}
                            </Text>
                        )}
                        {validationResult.status !== 'valid' && (
                            <Button size="xs" variant="link" onClick={onOpen} color="blue.500">
                                View Details
                            </Button>
                        )}
                    </HStack>
                )}
                <Button
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    onClick={handleValidate}
                    isLoading={isValidating}
                    loadingText="Validating..."
                >
                    Validate
                </Button>
            </HStack>

            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Validation Results</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        {validationResult && <DetailedValidationResult result={validationResult} />}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
}
