import { z } from 'zod';

export const EntityEnum = z.enum(['data_channel', 'partner_organization']);

export type EntityEnum = z.infer<typeof EntityEnum>;
