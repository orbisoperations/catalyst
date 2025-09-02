import { z } from 'zod/v4';

export const WriteResult = z.object({
    writtenAt: z.object({
        token: z.string(),
    }),
});
export type WriteResult = z.infer<typeof WriteResult>;

export const RelationshipUpdate = z.object({
    operation: z.enum(['OPERATION_CREATE', 'OPERATION_TOUCH', 'OPERATION_DELETE']),
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
    }),
});
export type RelationshipUpdate = z.infer<typeof RelationshipUpdate>;

export const WriteBody = z.object({
    updates: z.array(RelationshipUpdate),
});
export type WriteBody = z.infer<typeof WriteBody>;

export const Relationship = z.object({
    relationOwner: z.object({
        objectType: z.string(),
        objectId: z.string(),
    }),
    relation: z.string(),
    relatedItem: z.object({
        objectType: z.string(),
        objectId: z.string(),
    }),
});
export type Relationship = z.infer<typeof Relationship>;
