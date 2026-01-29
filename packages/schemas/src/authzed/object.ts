import { z } from 'zod/v4';

export const AuthzedObject = z.object({
    objectType: z.string(),
    objectId: z.string(),
});
export type AuthzedObject = z.infer<typeof AuthzedObject>;
