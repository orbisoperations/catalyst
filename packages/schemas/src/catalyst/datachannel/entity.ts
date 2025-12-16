import { z } from 'zod/v4';

/**
 * Entity relationships for DataChannel:
 * - organization: The owner organization (creatorOrganization)
 * - shared_with_organization: Partner organizations the channel is shared with
 */
export const EntityEnum = z.enum(['organization', 'shared_with_organization']);
export type EntityEnum = z.infer<typeof EntityEnum>;
