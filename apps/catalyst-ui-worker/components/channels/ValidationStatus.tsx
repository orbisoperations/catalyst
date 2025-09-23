'use client';
import { Badge, Button, Spinner, Tooltip } from '@chakra-ui/react';
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';
import { validateChannel } from '@/app/actions/validation';

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

export function ValidationStatusBadge({ status }: { status?: 'valid' | 'invalid' | 'error' | 'pending' }) {
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
    };

    const config = configs[status];

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
    const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'error' | undefined>();
    const [lastError, setLastError] = useState<string>();

    const handleValidate = async () => {
        setIsValidating(true);
        setValidationStatus(undefined);
        setLastError(undefined);

        try {
            const result = await validateChannel(channelId, endpoint, organizationId);

            // Map the result status to our badge status
            if (result.status === 'valid') {
                setValidationStatus('valid');
            } else if (result.status === 'invalid') {
                setValidationStatus('invalid');
                setLastError(result.error || 'Validation failed');
            } else {
                setValidationStatus('error');
                setLastError(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Validation error:', error);
            setValidationStatus('error');
            setLastError('Failed to run validation');
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {validationStatus && (
                <Tooltip label={lastError} isDisabled={!lastError}>
                    <div>
                        <ValidationStatusBadge status={validationStatus} />
                    </div>
                </Tooltip>
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
        </div>
    );
}
