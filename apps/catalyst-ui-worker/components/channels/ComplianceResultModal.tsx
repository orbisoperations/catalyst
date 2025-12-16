'use client';

import {
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
} from '@chakra-ui/react';
import { DetailedComplianceResult } from './DetailedComplianceResult';
import type { ComplianceResult } from '@catalyst/schemas';

export interface ComplianceResultModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** The compliance result to display (null if no result selected) */
    result: ComplianceResult | null;
    /** Callback when the modal is closed */
    onClose: () => void;
}

/**
 * Modal for displaying detailed compliance check results.
 *
 * Wraps the DetailedComplianceResult component in a modal dialog.
 */
export function ComplianceResultModal({
    isOpen,
    result,
    onClose,
}: ComplianceResultModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent data-testid="modal-compliance-result">
                <ModalHeader data-testid="modal-compliance-result-title">
                    Compliance Results
                </ModalHeader>
                <ModalCloseButton aria-label="Close compliance results" />
                <ModalBody pb={6} data-testid="modal-compliance-result-body">
                    {result && <DetailedComplianceResult result={result} />}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
