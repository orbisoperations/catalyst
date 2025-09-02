import { z } from 'zod/v4';
// Used for Authzed/SpiceDB relationship management
export const RoleEnum = z.enum(['admin', 'data_custodian', 'user']);
export type RoleEnum = z.infer<typeof RoleEnum>;
