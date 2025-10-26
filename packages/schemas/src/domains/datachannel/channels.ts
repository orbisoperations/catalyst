import { z } from 'zod/v4';
import { OrgIdSchema } from '../../core/identifiers';
import { safeName, safeDescription, safeUrl } from '../../core/security';

// Data Channel schema with proper validation (maintaining backward compatibility)
export const DataChannelSchema = z.object({
    id: z.string().min(1, 'Data Channel ID is required'),
    accessSwitch: z.boolean(),
    name: safeName(),
    endpoint: safeUrl(),
    description: safeDescription(),
    creatorOrganization: OrgIdSchema,
});

// Alternative enhanced schema with composition features for new code
// export const DataChannelEnhancedSchema = withAudit(withTimestamps(DataChannelSchema));

export type DataChannel = z.infer<typeof DataChannelSchema>;
