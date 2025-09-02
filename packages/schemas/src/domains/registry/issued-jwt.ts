import { z } from 'zod/v4';
import { JWTRegisterStatusEnum } from '../../constants/statuses';

// Re-export for backward compatibility
export const JWTRegisterStatus = JWTRegisterStatusEnum;
export type JWTRegisterStatus = z.infer<typeof JWTRegisterStatusEnum>;

export const IssuedJWTRegistry = z.object({
    id: z.string().min(1, 'ID is required').max(100, 'ID too long'),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
    description: z.string().min(1, 'Description is required').max(500, 'Description too long').trim(),
    claims: z
        .array(z.string())
        .max(50, 'Maximum 50 claims allowed')
        .refine((claims) => claims.every((claim) => claim.length <= 255), 'Each claim must be 255 characters or less'),
    expiry: z.date().refine((date) => date > new Date(), 'Expiry date must be in the future'),
    organization: z.string().min(1, 'Organization is required').max(100, 'Organization ID too long'),
    status: JWTRegisterStatus.default(JWTRegisterStatus.enum.active),
});

export type IssuedJWTRegistry = z.infer<typeof IssuedJWTRegistry>;

// Alias for backward compatibility
export const zIssuedJWTRegistry = IssuedJWTRegistry;
