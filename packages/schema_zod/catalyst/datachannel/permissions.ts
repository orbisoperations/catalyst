import { z } from 'zod';

export const PermissionsEnum = z.enum([
  "read"
])

export type PermissionsEnum = z.infer<typeof PermissionsEnum>
