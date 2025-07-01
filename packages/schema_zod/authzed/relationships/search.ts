import { z } from 'zod';
import * as Catalyst from '../../catalyst';

export const SearchInfo = z.object({
    resourceType: Catalyst.EntityEnum,
    resourceId: z.string().optional(),
    relation: z.union([Catalyst.DataChannel.EntityEnum, Catalyst.RoleEnum, Catalyst.Org.EntityEnum]).optional(),
    optionalSubjectFilter: z
        .object({
            subjectType: Catalyst.EntityEnum,
            optionalSubjectId: z.string(),
        })
        .optional(),
});

export type SearchInfo = z.infer<typeof SearchInfo>;
