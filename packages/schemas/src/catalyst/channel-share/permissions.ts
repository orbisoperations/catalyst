import { z } from 'zod/v4';

export const PermissionsEnum = z.enum(['can_access']);
export type PermissionsEnum = z.infer<typeof PermissionsEnum>;
