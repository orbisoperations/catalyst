import {z} from "zod"
export  * as Authzed from "./authzed"
export * as Catalyst from "./catalyst"
export * from "./types"

import * as Catalyst from "./catalyst"

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
          relation: Catalyst.RoleEnum,
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