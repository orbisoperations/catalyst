import { z } from 'zod/v4';

export const DeleteResult = z.object({
    deletedAt: z.object({
        token: z.string(),
    }),
});
export type DeleteResult = z.infer<typeof DeleteResult>;

export const DeleteBody = z.object({
    relationshipFilter: z.object({
        resourceType: z.string(),
        optionalResourceId: z.string().optional(),
        optionalRelation: z.string().optional(),
        optionalSubjectFilter: z
            .object({
                subjectType: z.string(),
                optionalSubjectId: z.string().optional(),
            })
            .optional(),
    }),
});
export type DeleteBody = z.infer<typeof DeleteBody>;
