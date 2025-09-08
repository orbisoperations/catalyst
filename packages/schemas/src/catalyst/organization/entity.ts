import { z } from 'zod/v4';

export const EntityEnum = z.enum(['data_channel', 'partner_organization']);
export type EntityEnum = z.infer<typeof EntityEnum>;

// Add enum property for backward compatibility
export const EntityEnumWithEnum = {
    ...EntityEnum,
    // Note: EntityEnum already has an enum property from Zod
};
