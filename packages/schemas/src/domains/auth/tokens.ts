import { z } from 'zod/v4';

export const TokenSchema = z
    .object({
        cfToken: z.jwt().optional(),
        catalystToken: z.jwt().optional(),
    })
    .refine((data) => data.cfToken || data.catalystToken, {
        message: 'At least one token (cfToken or catalystToken) must be provided',
        path: ['cfToken', 'catalystToken'],
    });

export type Token = z.infer<typeof TokenSchema>;
// Export schema for backward compatibility
export const TokenConst = TokenSchema;
export const Token = TokenSchema;
