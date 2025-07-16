import { z } from 'zod';

export const PermissionsEnum = z.enum([
    'member',
    'role_assign',
    'data_channel_create',
    'data_channel_update',
    'data_channel_delete',
    'data_channel_read',
    'partner_update',
]);

export type PermissionsEnum = z.infer<typeof PermissionsEnum>;
