import {z} from "zod"

export const zDataChannel = z.object({
  id: z.string(),
  accessSwitch: z.boolean(),
  name: z.string(),
  endpoint: z.string(),
  description: z.string(),
  creatorOrganization: z.string(),
})

export type DataChannel = z.infer<typeof zDataChannel>

export const zOrgId = z.string()
export type OrgId = z.infer<typeof zOrgId>

export const zUserId = z.string()
export type UserId = z.infer<typeof zUserId>

export const zDataChannelId = z.string()
export type DataChannelId = z.infer<typeof zDataChannelId>

export const zIssuedJWTRegistry = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  claims: z.array(z.string()),
  expiry: z.date(),
  hash: z.string(),
})

export type IssuedJWTRegistry = z.infer<typeof zIssuedJWTRegistry>
