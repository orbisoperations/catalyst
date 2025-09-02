import { z } from 'zod/v4';
import { BaseErrorSchema } from '../../core/common';
import { DataChannelSchema } from './channels';

// Data Channel Action Response schemas
const dataChannelActionSuccessSchema = z.object({
    success: z.literal(true),
    data: z.union([DataChannelSchema, DataChannelSchema.array()]),
});

const dataChannelActionErrorSchema = z.object({
    success: z.literal(false),
    error: z.string(),
});

export const DataChannelActionResponse = z.discriminatedUnion('success', [
    dataChannelActionErrorSchema,
    dataChannelActionSuccessSchema,
]);
export const DataChannelActionResponseSchema = DataChannelActionResponse;

export type DataChannelActionResponse = z.infer<typeof DataChannelActionResponseSchema>;

// Data Channel Access Token schemas
export const DataChannelAccessTokenSuccessSchema = z.object({
    success: z.literal(true),
    claim: z.string(),
    dataChannel: DataChannelSchema,
    singleUseToken: z.string(),
});

export const DataChannelAccessTokenErrorSchema = z.object({
    success: z.literal(false),
    error: z.string(),
});

export const DataChannelAccessTokenSchema = z.discriminatedUnion('success', [
    DataChannelAccessTokenErrorSchema,
    DataChannelAccessTokenSuccessSchema,
]);

export type DataChannelAccessToken = z.infer<typeof DataChannelAccessTokenSchema>;

// Data Channel Multi Access schemas
export const DataChannelMultiAccessSuccessSchema = z.object({
    success: z.literal(true),
    channelPermissions: DataChannelAccessTokenSchema.array(),
});

export const DataChannelMultiAccessResponseSchema = z.discriminatedUnion('success', [
    DataChannelMultiAccessSuccessSchema,
    BaseErrorSchema,
]);

export type DataChannelMultiAccessResponse = z.infer<typeof DataChannelMultiAccessResponseSchema>;
