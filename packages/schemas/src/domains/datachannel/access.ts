import { z } from 'zod/v4';
import { BaseErrorSchema } from '../../core/common';
import {
    // DataChannelSchema,
    DataChannelStoredSchema,
    DataChannel,
} from './channels';

// Data Channel Action Response schemas
// Use StoredSchema to accept data with lenient validation (for reading from storage)
const dataChannelActionSuccessSchema = z.object({
    success: z.literal(true),
    data: z.union([DataChannelStoredSchema, DataChannelStoredSchema.array()]),
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
// Use StoredSchema to accept channels with lenient validation
export const DataChannelAccessTokenSuccessSchema = z.object({
    success: z.literal(true),
    claim: z.string(),
    dataChannel: DataChannelStoredSchema,
    singleUseToken: z.string(),
});

export const DataChannelAccessTokenErrorSchema = z.object({
    success: z.literal(false),
    claim: z.string().optional(), // Optional to support errors without associated claims
    error: z.string(),
});

export const DataChannelAccessTokenSchema = z.discriminatedUnion('success', [
    DataChannelAccessTokenErrorSchema,
    DataChannelAccessTokenSuccessSchema,
]);

// Explicit type to avoid deep type instantiation issues
export type DataChannelAccessToken =
    | {
          success: true;
          claim: string;
          dataChannel: DataChannel;
          singleUseToken: string;
      }
    | {
          success: false;
          claim?: string;
          error: string;
      };

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
