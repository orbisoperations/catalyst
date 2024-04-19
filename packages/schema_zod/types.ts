import {z} from "zod"

export const DataChannel = z.object({
  id: z.string(),
  accessSwitch: z.boolean(),
  name: z.string(),
  endpoint: z.string(),
  description: z.string(),
  creatorOrganization: z.string(),
})

export type DataChannel = z.infer<typeof DataChannel>

export const OrgId = z.string()
export type OrgId = z.infer<typeof OrgId>

export const UserId = z.string()
export type UserId = z.infer<typeof UserId>

export const DataChannelId = z.string()
export type DataChannelId = z.infer<typeof DataChannelId>