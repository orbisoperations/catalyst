import { z } from 'zod';

export const EntityEnum = z.enum(['channel', 'partner']);

export type EntityEnum = z.infer<typeof EntityEnum>;
