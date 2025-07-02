import { z } from 'zod';
import { RoleEnum } from './roles';
import * as Org from './organization';
import * as DataChannel from './datachannel';

export const EntityEnum = z.enum(['user', 'organization', 'data_channel']);
export type EntityEnum = z.infer<typeof EntityEnum>;

export const Relationship = z.object({
    object: z.string(),
    relation: z.union([RoleEnum, Org.EntityEnum, DataChannel.EntityEnum]),
    subject: z.string(),
});

export type Relationship = z.infer<typeof Relationship>;
