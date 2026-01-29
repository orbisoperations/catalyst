import { z } from 'zod/v4';

export const PermissionsEnum = z.enum(['read_by_owning_org', 'read_by_partner_org']);
export type PermissionsEnum = z.infer<typeof PermissionsEnum>;
