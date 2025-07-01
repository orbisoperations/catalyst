import { z } from 'zod';
import { defineResult } from '../helpers/result';

export const UserRole = z.enum(['platform-admin', 'org-admin', 'org-user', 'data-custodian']);
export type UserRole = z.infer<typeof UserRole>;

export const User = z.object({
    userId: z.string(),
    orgId: z.string(),
    zitadelRoles: UserRole.array(),
});

export type User = z.infer<typeof User>;

export const UserResult = defineResult(User);
export type UserResult = z.infer<typeof UserResult>;
