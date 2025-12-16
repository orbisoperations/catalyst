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
import { checkChannelCompliance } from '@/app/actions/compliance';
import { DetailedComplianceResult } from './DetailedComplianceResult';
import type { ComplianceResult } from '@catalyst/schemas';

type ComplianceStatus = ComplianceResult['status'];

interface ComplianceStatusProps {
    channelId: string;
    endpoint: string;
    organizationId: string;
    lastCheck?: {
        status: ComplianceStatus;
        timestamp: number;
        error?: string;
    };
}

export function ComplianceStatusBadge({ status }: { status?: ComplianceStatus }) {
    if (!status) {
        return (
            <Badge colorScheme="gray" display="flex" alignItems="center" gap={1}>
                <ClockIcon width={12} height={12} />
                Never Validated
            </Badge>
        );
    }

    const configs = {
        compliant: {
            color: 'green',
            icon: <CheckCircleIcon width={12} height={12} />,
            label: 'Compliant',
        },
        non_compliant: {
            color: 'red',
            icon: <XCircleIcon width={12} height={12} />,
            label: 'Non-compliant',
        },
        error: {
            color: 'orange',
            icon: <ExclamationCircleIcon width={12} height={12} />,
            label: 'Error',
        },
        pending: {
            color: 'blue',
            icon: <Spinner size="xs" />,
            label: 'Verifying...',
        },
        not_checked: {
            color: 'gray',
            icon: <ExclamationCircleIcon width={12} height={12} />,
            label: 'Not Checked',
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

export function ComplianceCheckButton({
    channelId,
    endpoint,
    organizationId,
    'data-testid': dataTestId,
}: Omit<ComplianceStatusProps, 'lastCheck'> & { 'data-testid'?: string }) {
    const [isChecking, setIsChecking] = useState(false);
    const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const handleCheckCompliance = async () => {
        setIsChecking(true);
        setComplianceResult(null);

        try {
            const result = await checkChannelCompliance(channelId, endpoint, organizationId);
            setComplianceResult(result);

            // Open modal to show detailed results if check failed
            if (result.status !== 'compliant') {
                onOpen();
            }
        } catch (error) {
            console.error('Compliance check error:', error);
            setComplianceResult({
                channelId,
                status: 'error',
                timestamp: Date.now(),
                error: 'Failed to run compliance check',
                details: {
                    endpoint,
                    organizationId,
                    duration: 0,
                    tests: [],
                },
            });
        } finally {
            setIsChecking(false);
        }
    };

    const getTestsSummary = () => {
        if (!complianceResult?.details?.tests) return null;
        const passed = complianceResult.details.tests.filter((t) => t.success).length;
        const total = complianceResult.details.tests.length;
        return `${passed}/${total} tests`;
    };

    return (
        <>
            <HStack spacing={2}>
                {complianceResult && (
                    <HStack spacing={2}>
                        <ComplianceStatusBadge status={complianceResult.status} />
                        {complianceResult.details?.tests && complianceResult.details.tests.length > 0 && (
                            <Text fontSize="xs" color="gray.600">
                                {getTestsSummary()}
                            </Text>
                        )}
                        {complianceResult.status !== 'compliant' && (
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
                    onClick={handleCheckCompliance}
                    isLoading={isChecking}
                    loadingText="Checking..."
                    data-testid={dataTestId}
                >
                    Check Compliance
                </Button>
            </HStack>

            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Compliance Results</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        {complianceResult && <DetailedComplianceResult result={complianceResult} />}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
}
