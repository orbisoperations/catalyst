import { z } from 'zod';
import { DataChannel } from './data_channel';

const DataChannelAccessTokenSuccess = z.object({
    success: z.literal(true),
    claim: z.string(),
    dataChannel: DataChannel,
    singleUseToken: z.string(),
});

const DataChannelAccessTokenError = z.object({
    success: z.literal(false),
    error: z.string(),
});

export const DataChannelAccessToken = z.discriminatedUnion('success', [
    DataChannelAccessTokenSuccess,
    DataChannelAccessTokenError,
]);
export type DataChannelAccessToken = z.infer<typeof DataChannelAccessToken>;

export const DataChannelMultiAccessSuccess = z.object({
    success: z.literal(true),
    channelPermissions: DataChannelAccessToken.array(),
});

export const DataChannelMultiAccessResponse = z.discriminatedUnion('success', [
    DataChannelMultiAccessSuccess,
    z.object({ success: z.literal(false), error: z.string() }),
]);
export type DataChannelMultiAccessResponse = z.infer<typeof DataChannelMultiAccessResponse>;
