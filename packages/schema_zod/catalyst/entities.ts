import { z } from 'zod';
import { RoleEnum } from './roles';
import * as Org from './organization';
import * as DataChannel from './datachannel';
import * as ChannelShare from './channel-share';

export const EntityEnum = z.enum(['user', 'organization', 'data_channel', 'channel_share']);
export type EntityEnum = z.infer<typeof EntityEnum>;

export const Relationship = z.object({
    object: z.string(),
    relation: z.union([RoleEnum, Org.EntityEnum, DataChannel.EntityEnum, ChannelShare.EntityEnum]),
    subject: z.string(),
});

export type Relationship = z.infer<typeof Relationship>;
