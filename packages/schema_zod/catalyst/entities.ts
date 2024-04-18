import { z } from 'zod';

export const EntityEnum = z.enum([
  "user",
  "organization",
  "data_channel"
])
export type EntityEnum = z.infer<typeof EntityEnum>

export const EntityString = z.union([
  z.string().endsWith(EntityEnum.enum.user),
  z.string().endsWith(EntityEnum.enum.organization),
  z.string().endsWith(EntityEnum.enum.data_channel)
])

export type EntityString = z.infer<typeof EntityString>