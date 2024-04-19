import {z} from "zod"

export const RoleEnum = z.enum([
  "admin",
  "data_custodian",
  "user"
])

export type RoleEnum = z.infer<typeof RoleEnum>