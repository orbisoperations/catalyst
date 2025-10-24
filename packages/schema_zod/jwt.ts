import { z } from 'zod';
import { BaseError } from './common';
import { DataChannel } from './core_entities';

/**
 * JWT Audience values for different token types
 */
export const JWTAudience = z.enum([
    'catalyst:gateway', // For gateway access tokens (UI -> Gateway)
    'catalyst:datachannel', // For single-use tokens (Gateway -> Data Channel)
    'catalyst:system', // For system service tokens
]);
export type JWTAudience = z.infer<typeof JWTAudience>;

export const Token = z.object({
    cfToken: z.string().optional(),
    catalystToken: z.string().optional(),
});

export type Token = z.infer<typeof Token>;

export const PermissionCheckResponse = z.object({
    success: z.boolean(),
    error: z.string().optional(),
});

export type PermissionCheckResponse = z.infer<typeof PermissionCheckResponse>;

const jwtParseSuccess = z.object({
    valid: z.literal(true),
    entity: z.string(),
    claims: z.string().array(),
    jwtId: z.string().optional(),
    audience: z.string().optional(),
});

const jwtParseError = z.object({
    valid: z.literal(false),
    entity: z.literal(undefined),
    claims: z.string().array().length(0),
    error: z.string(),
});
export const JWTParsingResponse = z.discriminatedUnion('valid', [jwtParseError, jwtParseSuccess]);
export type JWTParsingResponse = z.infer<typeof JWTParsingResponse>;

export const JWTRegisterStatus = z.enum(['active', 'revoked', 'deleted', 'expired']);
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
export const zIssuedJWTRegistryActionResponse = z.discriminatedUnion('success', [
    zIssuedJWTRegistryActionError,
    zIssuedJWTRegistryActionSuccess,
]);

export type IssuedJWTRegistryActionResponse = z.infer<typeof zIssuedJWTRegistryActionResponse>;

export const JWTSigningRequest = z.object({
    entity: z.string(),
    claims: z.string().array(),
    audience: JWTAudience.optional(), // Optional for backwards compatibility
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

export const JWTSigningResponse = z.discriminatedUnion('success', [JWTSigningSuccess, JWTSigningError]);

export type JWTSigningResponse = z.infer<typeof JWTSigningResponse>;

/**
 *  Single use token related types
 */
export const DataChannelAccessTokenSuccess = z.object({
    success: z.literal(true),
    claim: z.string(),
    dataChannel: DataChannel,
    singleUseToken: z.string(),
});

export const DataChannelAccessTokenError = z.object({
    success: z.literal(false),
    error: z.string(),
});

export const DataChannelAccessToken = z.discriminatedUnion('success', [
    DataChannelAccessTokenError,
    DataChannelAccessTokenSuccess,
]);

export type DataChannelAccessToken = z.infer<typeof DataChannelAccessToken>;

export const DataChannelMultiAccessSuccess = z.object({
    success: z.literal(true),
    channelPermissions: DataChannelAccessToken.array(),
});

export const DataChannelMultiAccessResponse = z.discriminatedUnion('success', [
    DataChannelMultiAccessSuccess,
    BaseError,
]);

export type DataChannelMultiAccessResponse = z.infer<typeof DataChannelMultiAccessResponse>;

export const JWTRotateResponse = z.discriminatedUnion('success', [
    z.object({
        success: z.literal(true),
    }),
    z.object({
        success: z.literal(false),
        error: z.string(),
    }),
]);

export type JWTRotateResponse = z.infer<typeof JWTRotateResponse>;
