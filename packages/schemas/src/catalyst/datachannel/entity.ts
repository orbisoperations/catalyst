import { z } from 'zod/v4';

export const EntityEnum = z.enum(['organization']);
export type EntityEnum = z.infer<typeof EntityEnum>;
