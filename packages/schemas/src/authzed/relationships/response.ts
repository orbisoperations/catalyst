import { z } from 'zod/v4';

export const QueryResponse = z.object({
    result: z.object({
        readAt: z.object({
            token: z.string(),
        }),
        relationship: z.object({
            resource: z.object({
                objectType: z.string(),
                objectId: z.string(),
            }),
            relation: z.string(),
            subject: z.object({
                object: z.object({
                    objectType: z.string(),
                    objectId: z.string(),
                }),
                optionalRelation: z.string().optional(),
            }),
            optionalCaveat: z.unknown().nullable().optional(),
            optionalExpiresAt: z.unknown().nullable().optional(),
        }),
        afterResultCursor: z
            .object({
                token: z.string(),
            })
            .optional(),
    }),
});
export type QueryResponse = z.infer<typeof QueryResponse>;
