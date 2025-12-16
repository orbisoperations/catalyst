'use client';

import { memo, useCallback } from 'react';
import { DataTable } from '@orbisoperations/o2-ui';
import Link from 'next/link';

export interface Partner {
    /** Unique identifier for the partner */
    id: string;
    /** Partner organization name */
    name: string;
    /** Partner description */
    description: string;
    /** Whether sharing is enabled for this partner */
    sharing: boolean;
}

export interface PartnerSharingRowProps {
    /** Partner data to display */
    partner: Partner;
    /** Callback when sharing toggle is changed */
    onToggle: (partnerId: string, sharing: boolean) => void;
    /** Whether the toggle is disabled */
    isDisabled?: boolean;
}

/**
 * A single row in the sharing list table displaying partner info and sharing toggle.
 *
 * Memoized to prevent re-renders when partner data hasn't changed.
 */
export const PartnerSharingRow = memo(function PartnerSharingRow({
    partner,
    onToggle,
    isDisabled = false,
}: PartnerSharingRowProps) {
    const handleToggle = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onToggle(partner.id, e.target.checked);
        },
        [onToggle, partner.id]
    );

    return (
        <DataTable.Row data-testid={`sharing-row-${partner.id}`}>
            {/* Partner Name */}
            <DataTable.Cell alignment="left">
                <Link
                    href={`/partners/${partner.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                    data-testid={`sharing-row-${partner.id}-link`}
                >
                    {partner.name}
                </Link>
            </DataTable.Cell>

            {/* Description */}
            <DataTable.Cell alignment="left">
                <span className="block truncate text-gray-600" title={partner.description}>
                    {partner.description || '—'}
                </span>
            </DataTable.Cell>

            {/* Sharing Toggle */}
            <DataTable.Cell alignment="center">
                <label className="relative inline-flex cursor-pointer items-center">
                    <input
                        type="checkbox"
                        checked={partner.sharing}
                        onChange={handleToggle}
                        disabled={isDisabled}
                        aria-label={`Toggle sharing for ${partner.name}`}
                        className="peer sr-only"
                        data-testid={`sharing-row-${partner.id}-toggle`}
                    />
                    <div
                        className={`
                            h-6 w-11 rounded-full bg-gray-200
                            after:absolute after:left-[2px] after:top-[2px]
                            after:h-5 after:w-5 after:rounded-full
                            after:border after:border-gray-300 after:bg-white
                            after:transition-all after:content-['']
                            peer-checked:bg-blue-600 peer-checked:after:translate-x-full
                            peer-checked:after:border-white
                            peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300
                            peer-disabled:cursor-not-allowed peer-disabled:opacity-50
                        `}
                    />
                </label>
            </DataTable.Cell>
        </DataTable.Row>
    );
});
