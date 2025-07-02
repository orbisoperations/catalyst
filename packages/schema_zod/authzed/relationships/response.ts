import { z } from 'zod';
import * as Catalyst from '../../catalyst';

export const QueryResponse = z.object({
    result: z.object({
        afterResultCursor: z.object({
            token: z.string(),
        }),
        readAt: z.object({
            token: z.string(),
        }),
        relationship: z.object({
            resource: z.object({
                objectType: z.string(),
                objectId: z.string(),
            }),
            relation: z.union([Catalyst.RoleEnum, Catalyst.Org.EntityEnum, Catalyst.DataChannel.EntityEnum]),
            subject: z.object({
                object: z.object({
                    objectType: z.string(),
                    objectId: z.string(),
                }),
                optionalRelation: z.string().optional(),
            }),
        }),
        optionalCaveat: z
            .object({
                caveatName: z.string(),
                context: z.record(z.any()),
            })
            .optional(),
    }),
});

export type QueryResponse = z.infer<typeof QueryResponse>;
