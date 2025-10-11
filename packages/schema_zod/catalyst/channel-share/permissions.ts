import { z } from 'zod';

export const PermissionsEnum = z.enum(['can_access']);

export type PermissionsEnum = z.infer<typeof PermissionsEnum>;
