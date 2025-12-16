import { useState, useCallback, useEffect } from 'react';
import { DataChannel, ComplianceResult } from '@catalyst/schemas';
import { canUserCheckCompliance, checkChannelCompliance } from '@/app/actions/compliance';
import { createPendingResult, createErrorResult } from '@/lib/compliance-utils';

export interface UseChannelComplianceOptions {
    /** Initial compliance results to pre-populate (useful for mock data) */
    initialResults?: Record<string, ComplianceResult>;
}

export interface UseChannelComplianceReturn {
    complianceResults: Record<string, ComplianceResult>;
    checkingCompliance: Record<string, boolean>;
    selectedComplianceResult: ComplianceResult | null;
    canCheckCompliance: boolean;
    /** Check compliance for a channel. Returns the result for immediate use. */
    checkCompliance: (channel: DataChannel) => Promise<ComplianceResult | null>;
    setSelectedComplianceResult: (result: ComplianceResult | null) => void;
}

export function useChannelCompliance(options: UseChannelComplianceOptions = {}): UseChannelComplianceReturn {
    const { initialResults = {} } = options;
    const [complianceResults, setComplianceResults] = useState<Record<string, ComplianceResult>>(initialResults);
    const [checkingCompliance, setCheckingCompliance] = useState<Record<string, boolean>>({});
    const [selectedComplianceResult, setSelectedComplianceResult] = useState<ComplianceResult | null>(null);
    const [canCheckCompliance, setCanCheckCompliance] = useState(false);

    // Check user permission on mount with proper cleanup
    useEffect(() => {
        let cancelled = false;

        canUserCheckCompliance()
            .then((result) => {
                if (!cancelled) setCanCheckCompliance(result);
            })
            .catch(() => {
                if (!cancelled) setCanCheckCompliance(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const checkCompliance = useCallback(async (channel: DataChannel): Promise<ComplianceResult | null> => {
        const { id, endpoint, creatorOrganization } = channel;

        setCheckingCompliance((prev) => ({ ...prev, [id]: true }));
        setComplianceResults((prev) => ({
            ...prev,
            [id]: createPendingResult(id, endpoint, creatorOrganization),
        }));

        try {
            const result = await checkChannelCompliance(id, endpoint, creatorOrganization);
            setComplianceResults((prev) => ({ ...prev, [id]: result }));
            return result;
        } catch (error) {
            console.error('Compliance check error:', error);
            const errorResult = createErrorResult(id, endpoint, creatorOrganization);
            setComplianceResults((prev) => ({
                ...prev,
                [id]: errorResult,
            }));
            return errorResult;
        } finally {
            setCheckingCompliance((prev) => ({ ...prev, [id]: false }));
        }
    }, []);

    return {
        complianceResults,
        checkingCompliance,
        selectedComplianceResult,
        canCheckCompliance,
        checkCompliance,
        setSelectedComplianceResult,
    };
}
