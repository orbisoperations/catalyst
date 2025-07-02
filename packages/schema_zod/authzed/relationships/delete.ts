import { z } from 'zod';
import * as Catalyst from '../../catalyst';

export const DeleteBody = z.object({
    relationshipFilter: z.object({
        resourceType: Catalyst.EntityEnum,
        optionalResourceId: z.string().optional(),
        optionalRelation: z
            .union([Catalyst.DataChannel.EntityEnum, Catalyst.RoleEnum, Catalyst.Org.EntityEnum])
            .optional(),
        optionalSubjectFilter: z
            .object({
                subjectType: Catalyst.EntityEnum,
                optionalSubjectId: z.string(),
            })
            .optional(),
    }),
});
export type DeleteBody = z.infer<typeof DeleteBody>;

export const DeletResult = z.object({
    deletedAt: z.object({
        token: z.string(),
    }),
    code: z.number().optional(),
    message: z.string().optional(),
    deletionProgress: z.string().optional(),
});
export type DeletResult = z.infer<typeof DeletResult>;
