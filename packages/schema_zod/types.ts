import { string, z } from "zod";
// DATA CHANNELS // DATA CHANNELS // DATA CHANNELS // DATA CHANNELS // DATA CHANNELS // DATA CHANNELS
export const zDataChannel = z.object({
  id: z.string(),
  accessSwitch: z.boolean(),
  name: z.string(),
  endpoint: z.string(),
  description: z.string(),
  creatorOrganization: z.string(),
});

export type DataChannel = z.infer<typeof zDataChannel>;

export const DataChannelId = z.string();
export type DataChannelId = z.infer<typeof DataChannelId>;

// DATA CHANNEL SCHEMA FILTERS // DATA CHANNEL SCHEMA FILTERS // DATA CHANNEL SCHEMA FILTERS
export const zDataChannelSchemaFilter = z.object({
  id: z.string(),
  dataChannelId: z.string(),
  partnerId: z.string(),
  filter: z.array(z.string()),
});

export type DataChannelSchemaFilter = z.infer<typeof zDataChannelSchemaFilter>;

export const zDataChannelSchemaFilterId = z.string();
export type DataChannelSchemaFilterId = z.infer<
  typeof zDataChannelSchemaFilterId
>;

export const OrgId = z.string();
export type OrgId = z.infer<typeof OrgId>;

// TOKEN // TOKEN // TOKEN // TOKEN // TOKEN // TOKEN // TOKEN // TOKEN // TOKEN // TOKEN // TOKEN // TOKEN
export const Token = z.object({
  cfToken: z.string().optional(),
  catalystToken: z.string().optional(),
});

export type Token = z.infer<typeof Token>;

// USER // USER // USER // USER // USER // USER // USER // USER // USER // USER // USER // USER // USER
export type User = z.infer<typeof User>;

export const UserId = z.string();
export type UserId = z.infer<typeof UserId>;

export const User = z.object({
  userId: UserId,
  orgId: OrgId,
  zitadelRoles: z
    .enum(["platform-admin", "org-admin", "org-user", "data-custodian"])
    .array(),
});

export const PermissionCheckResponse = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type PermissionCheckResponse = z.infer<typeof PermissionCheckResponse>;

// DATA CHANNEL ACTIONS // DATA CHANNEL ACTIONS // DATA CHANNEL ACTIONS // DATA CHANNEL ACTIONS
const dataChannelActionSuccess = z.object({
  success: z.literal(true),
  data: z.union([zDataChannel, zDataChannel.array()]),
});

const dataChannelActionError = z.object({
  success: z.literal(false),
  error: z.string(),
});
export const DataChannelActionResponse = z.discriminatedUnion("success", [
  dataChannelActionError,
  dataChannelActionSuccess,
]);

export type DataChannelActionResponse = z.infer<
  typeof DataChannelActionResponse
>;

// JWT PARSE // JWT PARSE // JWT PARSE // JWT PARSE // JWT PARSE // JWT PARSE // JWT PARSE // JWT PARSE
const jwtParseSuccess = z.object({
  valid: z.literal(true),
  entity: z.string(),
  claims: z.string().array(),
});

const jwtParseError = z.object({
  valid: z.literal(false),
  entity: z.literal(undefined),
  claims: z.string().array().length(0),
  error: z.string(),
});
export const JWTParsingResponse = z.discriminatedUnion("valid", [
  jwtParseError,
  jwtParseSuccess,
]);
export type JWTParsingResponse = z.infer<typeof JWTParsingResponse>;

// ISSUED JWT REGISTRY // ISSUED JWT REGISTRY // ISSUED JWT REGISTRY // ISSUED JWT REGISTRY
export const JWTRegisterStatus = z.enum([
  "active",
  "revoked",
  "deleted",
  "expired",
]);
export type JWTRegisterStatus = z.infer<typeof JWTRegisterStatus>;

export const zIssuedJWTRegistry = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  claims: z.array(z.string()),
  expiry: z.date(),
  organization: z.string(),
  status: JWTRegisterStatus.default(JWTRegisterStatus.enum.active),
});

export type IssuedJWTRegistry = z.infer<typeof zIssuedJWTRegistry>;

const zIssuedJWTRegistryActionSuccess = z.object({
  success: z.literal(true),
  data: z.union([zIssuedJWTRegistry, zIssuedJWTRegistry.array()]),
});

const zIssuedJWTRegistryActionError = z.object({
  success: z.literal(false),
  error: z.string(),
});
export const zIssuedJWTRegistryActionResponse = z.discriminatedUnion(
  "success",
  [zIssuedJWTRegistryActionError, zIssuedJWTRegistryActionSuccess],
);

export type IssuedJWTRegistryActionResponse = z.infer<
  typeof zIssuedJWTRegistryActionResponse
>;

// JWT SIGNING // JWT SIGNING // JWT SIGNING // JWT SIGNING // JWT SIGNING // JWT SIGNING
export const JWTSigningRequest = z.object({
  entity: z.string(),
  claims: z.string().array(),
  expiresIn: z.number().optional(),
});

export type JWTSigningRequest = z.infer<typeof JWTSigningRequest>;

export const JWTSigningSuccess = z.object({
  success: z.literal(true),
  token: z.string(),
  expiration: z.number(),
});

export const JWTSigningError = z.object({
  success: z.literal(false),
  error: z.string(),
});

export const JWTSigningResponse = z.discriminatedUnion("success", [
  JWTSigningSuccess,
  JWTSigningError,
]);

export type JWTSigningResponse = z.infer<typeof JWTSigningResponse>;

// JWT ROTATE // JWT ROTATE // JWT ROTATE // JWT ROTATE // JWT ROTATE // JWT ROTATE // JWT ROTATE
export const JWTRotateResponse = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export type JWTRotateResponse = z.infer<typeof JWTRotateResponse>;

// ORG INVITE // ORG INVITE // ORG INVITE // ORG INVITE // ORG INVITE // ORG INVITE // ORG INVITE
export const OrgInviteStatus = z.enum(["pending", "accepted", "declined"]);
export type OrgInviteStatus = z.infer<typeof OrgInviteStatus>;
export const OrgInvite = z.object({
  id: z.string(),
  status: OrgInviteStatus,
  sender: OrgId,
  receiver: OrgId,
  message: z.string(),
  isActive: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type OrgInvite = z.infer<typeof OrgInvite>;

const inviteAction = z.object({
  success: z.literal(true),
  invite: z.union([OrgInvite, OrgInvite.array()]),
});

const inviteError = z.object({
  success: z.literal(false),
  error: z.string(),
});

export const OrgInviteResponse = z.discriminatedUnion("success", [
  inviteAction,
  inviteError,
]);

export type OrgInviteResponse = z.infer<typeof OrgInviteResponse>;

const zUserCheckActionSuccess = z.object({
  success: z.literal(true),
  data: User,
});

const zUserCheckActionError = z.object({
  success: z.literal(false),
  error: z.string(),
});
export const UserCheckActionResponse = z.discriminatedUnion("success", [
  zUserCheckActionError,
  zUserCheckActionSuccess,
]);

export enum DEFAULT_STANDARD_DURATIONS {
  MS = 1,
  S = DEFAULT_STANDARD_DURATIONS.MS * 1000,
  M = DEFAULT_STANDARD_DURATIONS.S * 60,
  H = DEFAULT_STANDARD_DURATIONS.M * 60,
  D = DEFAULT_STANDARD_DURATIONS.H * 24,
  W = DEFAULT_STANDARD_DURATIONS.D * 7,
  MONTH = DEFAULT_STANDARD_DURATIONS.D * 30,
  Y = DEFAULT_STANDARD_DURATIONS.D * 365,
}
