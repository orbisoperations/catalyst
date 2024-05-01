import { string, z } from 'zod';

export const DataChannel = z.object({
  id: z.string(),
  accessSwitch: z.boolean(),
  name: z.string(),
  endpoint: z.string(),
  description: z.string(),
  creatorOrganization: z.string(),
});

export type DataChannel = z.infer<typeof DataChannel>;

export const OrgId = z.string();
export type OrgId = z.infer<typeof OrgId>;

export const UserId = z.string();
export type UserId = z.infer<typeof UserId>;

export const DataChannelId = z.string();
export type DataChannelId = z.infer<typeof DataChannelId>;

export const Token = z.object({
  cfToken: z.string().optional(),
  catalystToken: z.string().optional(),
});

export type Token = z.infer<typeof Token>;

export const User = z.object({
  userId: UserId,
  orgId: OrgId,
  zitadelRoles: z.enum(["platform-admin", "org-admin", "org-user"]).array(),
});

export type User = z.infer<typeof User>;

export const PermissionCheckResponse = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type PermissionCheckResponse = z.infer<typeof PermissionCheckResponse>;

const dataChannelActionSuccess = z.object({
  success: z.literal(true),
  data: z.union([DataChannel, DataChannel.array()]),
});

const dataChannelActionError = z.object({
  success: z.literal(false),
  error: z.string(),
});
export const DataChannelActionResponse = z.discriminatedUnion("success", [
  dataChannelActionError,
  dataChannelActionSuccess,
]);

export type DataChannelActionResponse = z.infer<typeof  DataChannelActionResponse>

const jwtParseSuccess = z.object({
  valid: z.literal(true),
  entity: z.string(),
  claims: z.string().array(),
});

const jwtParseError = z.object({
  valid: z.literal(false),
  entity: z.literal(undefined),
  claims: z.string().array().length(0),
  error: z.string()
})
export const JWTParsingResponse = z.discriminatedUnion(
  "valid", [
    jwtParseError,
    jwtParseSuccess
  ]
)
export type JWTParsingResponse = z.infer<typeof JWTParsingResponse>
export const zIssuedJWTRegistry = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  claims: z.array(z.string()),
  expiry: z.date(),
  hash: z.string(),
})

export type IssuedJWTRegistry = z.infer<typeof zIssuedJWTRegistry>

export const JWTSigningRequest = z.object({
  entity: z.string(),
  claims: z.string().array(),
  expiresIn: z.number().optional()
})

export type JWTSigningRequest = z.infer<typeof JWTSigningRequest>

export const JWTSigningSuccess = z.object({
  success: z.literal(true),
  token: z.string()
})

export const JWTSigningError = z.object({
  success: z.literal(false),
  error: z.string()
})

export const JWTSigningResponse = z.discriminatedUnion("success",
  [
    JWTSigningSuccess,
    JWTSigningError
  ])

export type JWTSigningResponse = z.infer<typeof JWTSigningResponse>

export const OrgInviteStatus = z.enum(["pending", "accepted", "declined"])
export type OrgInviteStatus = z.infer<typeof OrgInviteStatus>
export const OrgInvite = z.object({
  id: z.string(),
  status: OrgInviteStatus,
  sender: OrgId,
  receiver: OrgId,
  createdAt: z.number(),
  updatedAt: z.number()
})

export type OrgInvite = z.infer<typeof OrgInvite>

const invtiteAction = z.object({
  success: z.literal(true),
  invite: z.union([OrgInvite, OrgInvite.array()])
})

const inviteError = z.object({
  success: z.literal(false),
  error: z.string()
})

export const OrgInviteResponse = z.discriminatedUnion("success",
  [
    invtiteAction,
    inviteError
  ])

export type OrgInviteResponse = z.infer<typeof OrgInviteResponse>