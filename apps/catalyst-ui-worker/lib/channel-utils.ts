import { DataChannel, ComplianceResult, ComplianceStatus } from '@catalyst/schemas';

export type SortColumn = 'name' | 'description' | 'creatorOrganization' | 'status' | 'compliance';
export type SortDirection = 'asc' | 'desc';
export type FilterMode = 'all' | 'operational' | 'disabled' | 'subscribed' | 'owned';

/**
 * Sort order for compliance statuses (lower = higher priority)
 */
const COMPLIANCE_STATUS_ORDER: Record<ComplianceStatus, number> = {
    compliant: 0,
    pending: 1,
    non_compliant: 2,
    error: 3,
    not_checked: 4,
};

/**
 * Get sort value for a channel based on the sort column
 */
function getSortValue(
    channel: DataChannel,
    sortColumn: SortColumn,
    complianceResults: Record<string, ComplianceResult>
): string | number {
    switch (sortColumn) {
        case 'name':
            return channel.name.toLowerCase();
        case 'description':
            return (channel.description || '').toLowerCase();
        case 'creatorOrganization':
            return channel.creatorOrganization.toLowerCase();
        case 'status':
            return channel.accessSwitch ? 0 : 1;
        case 'compliance': {
            const status = complianceResults[channel.id]?.status || 'not_checked';
            return COMPLIANCE_STATUS_ORDER[status] ?? 4;
        }
        default:
            return 0;
    }
}

/**
 * Sort channels by the specified column and direction
 */
export function sortChannels(
    channels: DataChannel[],
    sortColumn: SortColumn | null,
    sortDirection: SortDirection | null,
    complianceResults: Record<string, ComplianceResult> = {}
): DataChannel[] {
    if (!sortColumn || !sortDirection) return channels;

    return [...channels].sort((a, b) => {
        const aValue = getSortValue(a, sortColumn, complianceResults);
        const bValue = getSortValue(b, sortColumn, complianceResults);

        let result: number;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            result = aValue - bValue;
        } else {
            result = String(aValue).localeCompare(String(bValue));
        }

        return sortDirection === 'asc' ? result : -result;
    });
}

/**
 * Filter channels by status, ownership, and search term
 */
export function filterChannels(
    channels: DataChannel[],
    filterMode: FilterMode,
    search: string,
    userOrg?: string
): DataChannel[] {
    let filtered = channels;

    // Apply status filter
    if (filterMode === 'operational') {
        filtered = filtered.filter((ch) => ch.accessSwitch === true);
    } else if (filterMode === 'disabled') {
        filtered = filtered.filter((ch) => ch.accessSwitch === false);
    }
    // Apply ownership filter
    else if (filterMode === 'subscribed') {
        filtered = filtered.filter((ch) => ch.creatorOrganization !== userOrg);
    } else if (filterMode === 'owned') {
        filtered = filtered.filter((ch) => ch.creatorOrganization === userOrg);
    }

    // Apply search filter
    if (search.trim()) {
        const term = search.toLowerCase();
        filtered = filtered.filter((ch) => ch.name.toLowerCase().includes(term));
    }

    return filtered;
}
