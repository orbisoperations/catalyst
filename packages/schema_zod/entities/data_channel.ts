import { z } from 'zod';
import { defineResult } from '../helpers/result';

export const DataChannel = z.object({
    id: z.string().min(1),
    accessSwitch: z.boolean(),
    name: z.string().min(3).max(64),
    endpoint: z.string().url(),
    description: z.string().max(512),
    creatorOrganization: z.string(),
});

export type DataChannel = z.infer<typeof DataChannel>;

export const DataChannelResult = defineResult(z.union([DataChannel, DataChannel.array()]));

export type DataChannelResult = z.infer<typeof DataChannelResult>;
