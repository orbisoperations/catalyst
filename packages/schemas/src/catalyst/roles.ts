import { z } from 'zod/v4';

export const RoleEnum = z.enum(['admin', 'data_custodian', 'user']);
export type RoleEnum = z.infer<typeof RoleEnum>;

// Add enum property for backward compatibility
export const RoleEnumWithEnum = {
    ...RoleEnum,
    // Note: RoleEnum already has an enum property from Zod
};
