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

export const CatalystOrgPermissions = z.enum([
    "member",
    "role_assign",
    "data_channel_create",
    "data_channel_update",
    "data_channel_delete",
    "data_channel_read"

])

export type CatalystOrgPermissions = z.infer<typeof CatalystOrgPermissions>

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

export const AuthzedPermissionCheckResponseError = z.object({
	code: z.number(),
	message: z.string(),
	details: z.object({
        "@type" : z.string().optional(),
		eiusmod93: z.object({}).optional(),
		labore2e: z.object({}).optional(),
		in_81a: z.object({}).optional()
    }).array()
})

export const AuthzedPermissionCheck = z.enum([
  "PERMISSIONSHIP_HAS_PERMISSION",
"PERMISSIONSHIP_NO_PERMISSION"])
export type AuthzedPermissionCheck = z.infer<typeof AuthzedPermissionCheck>
export const  AuthzedPermissionCheckResponseSuccess = z.object({
	checkedAt: z.object({
		token: z.string()
	}),
	permissionship: AuthzedPermissionCheck,
	partialCaveatInfo: z.object({
		missingRequiredContext: z.string().array()
	}).nullish().optional()
})

export const AuthzedPermissionCheckResponse = z.union([
    AuthzedPermissionCheckResponseSuccess,
    AuthzedPermissionCheckResponseError
])

export type AuthzedPermissionCheckResponseSuccess = z.infer<typeof  AuthzedPermissionCheckResponseSuccess>
export type AuthzedPermissionCheckResponseError = z.infer<typeof AuthzedPermissionCheckResponseError>
export type AuthzedPermissionCheckResponse = z.infer<typeof AuthzedPermissionCheckResponse>