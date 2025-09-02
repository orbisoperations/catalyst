import { z } from 'zod/v4';

export const ReadResult = z.object({
    result: z.object({
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
        readAt: z.object({
            token: z.string(),
        }),
        afterResultCursor: z
            .object({
                token: z.string(),
            })
            .optional(),
    }),
});
export type ReadResult = z.infer<typeof ReadResult>;
