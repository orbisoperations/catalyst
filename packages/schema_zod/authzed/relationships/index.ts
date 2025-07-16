import { z } from 'zod';
import { AuthzedObject } from '../';
import * as Catalyst from '../../catalyst';

export * from './read';
export * from './write';
export * from './delete';
export * from './search';
export * from './response';

export const Relationship = z.object({
    relationOwner: AuthzedObject,
    relation: z.union([Catalyst.RoleEnum, Catalyst.DataChannel.EntityEnum, Catalyst.Org.EntityEnum]),
    relatedItem: AuthzedObject,
});

export type Relationship = z.infer<typeof Relationship>;
