import { z } from 'zod';
import { defineResult } from '../helpers/result';

export const JWTRegisterStatus = z.enum(['active', 'revoked', 'deleted', 'expired']);
export type JWTRegisterStatus = z.infer<typeof JWTRegisterStatus>;

export const IssuedJWTRegistry = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    claims: z.array(z.string()),
    expiry: z.date(),
    organization: z.string(),
    status: JWTRegisterStatus.default(JWTRegisterStatus.enum.active),
});

export type IssuedJWTRegistry = z.infer<typeof IssuedJWTRegistry>;

export const IssuedJWTRegistryResult = defineResult(z.union([IssuedJWTRegistry, IssuedJWTRegistry.array()]));
export type IssuedJWTRegistryResult = z.infer<typeof IssuedJWTRegistryResult>;
