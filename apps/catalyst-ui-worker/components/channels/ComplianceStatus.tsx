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
import { checkCompliance } from '@/app/actions/compliance';
import { DetailedComplianceResult } from './DetailedComplianceResult';
import type { ComplianceResult, ComplianceStatus } from '@catalyst/schemas';
import { COMPLIANCE_STATUS_LABELS } from '@catalyst/schemas';

interface ComplianceStatusProps {
    channelId: string;
    endpoint: string;
    organizationId: string;
    lastComplianceCheck?: {
        status: 'compliant' | 'non_compliant' | 'error';
        timestamp: number;
        error?: string;
    };
}

export function ComplianceStatusBadge({ status }: { status?: ComplianceStatus }) {
    // Handle undefined/null status
    if (!status) {
        return (
            <Badge colorScheme="gray" display="flex" alignItems="center" gap={1}>
                <ClockIcon width={12} height={12} />
                {COMPLIANCE_STATUS_LABELS.not_checked}
            </Badge>
        );
    }

    const configs = {
        compliant: {
            color: 'green',
            icon: <CheckCircleIcon width={12} height={12} />,
        },
        non_compliant: {
            color: 'red',
            icon: <XCircleIcon width={12} height={12} />,
        },
        error: {
            color: 'orange',
            icon: <ExclamationCircleIcon width={12} height={12} />,
        },
        pending: {
            color: 'blue',
            icon: <Spinner size="xs" />,
        },
        not_checked: {
            color: 'gray',
            icon: <ClockIcon width={12} height={12} />,
        },
    };

    const config = configs[status as keyof typeof configs];

    return (
        <Badge colorScheme={config.color} display="flex" alignItems="center" gap={1}>
            {config.icon}
            {COMPLIANCE_STATUS_LABELS[status]}
        </Badge>
    );
}

export function ComplianceButton({
    channelId,
    endpoint,
    organizationId,
}: Omit<ComplianceStatusProps, 'lastComplianceCheck'>) {
    const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
    const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const handleCheckCompliance = async () => {
        setIsCheckingCompliance(true);
        setComplianceResult(null);

        try {
            const result = await checkCompliance(channelId, endpoint, organizationId);
            setComplianceResult(result);

            // Open modal to show detailed results if not compliant
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
            setIsCheckingCompliance(false);
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
                    isLoading={isCheckingCompliance}
                    loadingText="Checking..."
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
