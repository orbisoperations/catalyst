import {z} from "zod"

/*
export type DataChannel = {
    id: string;
    accessSwitch: number | null;
    name: string;
    endpoint: string;
    description: string | null;
    creatorOrganization: string;
};
*/

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
export const CatalystRole = z.enum([
    "admin",
    "data_custodian",
    "user"
])

export type CatalystRole = z.infer<typeof CatalystRole>

export const CatalystEntity = z.enum([
  "user",
  "organization"
])

export type CatalystEntity = z.infer<typeof CatalystEntity>

export const CatalystOrgRelationship = z.object({
    orgId: OrgId,
    relation: CatalystRole,
    subject: UserId
})

export type CatalystOrgRelationship = z.infer<typeof CatalystOrgRelationship>

export const AuthzedRelationshipQueryResponse = z.object({
  result: z.object({
      afterResultCursor: z.object({
          token: z.string()
      }),
      readAt: z.object({
          token: z.string()
      }),
      relationship: z.object({
          resource: z.object({
              objectType: z.string(),
              objectId: z.string()
          }),
          relation: CatalystRole,
          subject: z.object({
              object: z.object({
                  objectType: z.string(),
                  objectId: z.string()
              }),
              optionalRelation: z.string().optional()
          }),
      }),
      optionalCaveat: z.undefined()
  }),
})