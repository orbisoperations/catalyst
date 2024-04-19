import { z } from 'zod';

export const EntityEnum = z.enum([
  "organization",
])

export type  EntityEnum = z.infer<typeof EntityEnum>