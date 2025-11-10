import { z } from 'zod/v4';
import { OrgIdSchema } from '../../core/identifiers';
import { safeName, safeDescription, safeUrl } from '../../core/security';

// Strict schema for validating new input (create/update operations)
export const DataChannelInputSchema = z.object({
    id: z.string().min(1, 'Data Channel ID is required'),
    accessSwitch: z.boolean(),
    name: safeName(),
    endpoint: safeUrl(),
    description: safeDescription(),
    creatorOrganization: OrgIdSchema,
});

// Lenient schema for parsing stored data (allows old formats without strict validation)
// Uses plain string for creatorOrganization to accept any stored data including invalid formats
export const DataChannelStoredSchema = z.object({
    id: z.string().min(1, 'Data Channel ID is required'),
    accessSwitch: z.boolean(),
    name: z.string(),
    endpoint: z.string(),
    description: z.string(),
    creatorOrganization: z.string().max(100, 'Organization ID too long'), // Allow empty strings for old data
});

// Backwards compatibility: DataChannelSchema points to the input schema
export const DataChannelSchema = DataChannelInputSchema;

// Alternative enhanced schema with composition features for new code
// export const DataChannelEnhancedSchema = withAudit(withTimestamps(DataChannelSchema));

export type DataChannel = z.infer<typeof DataChannelInputSchema>;
