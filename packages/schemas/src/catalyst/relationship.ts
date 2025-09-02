import { z } from 'zod/v4';
import { RoleEnum } from './roles';
import { EntityEnum as OrgEntityEnum } from './organization/entity';
import { EntityEnum as DataChannelEntityEnum } from './datachannel/entity';

export const Relationship = z.object({
    object: z.string(),
    relation: z.union([RoleEnum, OrgEntityEnum, DataChannelEntityEnum]),
    subject: z.string(),
});
export type Relationship = z.infer<typeof Relationship>;
