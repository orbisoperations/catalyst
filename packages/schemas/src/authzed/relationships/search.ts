import { z } from 'zod/v4';

export const SearchInfo = z.object({
    resourceType: z.string(),
    resourceId: z.string(),
    relation: z.string(),
    optionalSubjectFilter: z
        .object({
            subjectType: z.string(),
            optionalSubjectId: z.string().optional(),
        })
        .optional(),
});
export type SearchInfo = z.infer<typeof SearchInfo>;
