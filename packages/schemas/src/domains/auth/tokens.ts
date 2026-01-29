import { z } from 'zod/v4';

export const TokenSchema = z
    .object({
        cfToken: z.string().optional(),
        catalystToken: z.string().optional(),
    })
    .refine((data) => data.cfToken || data.catalystToken, {
        message: 'At least one token (cfToken or catalystToken) must be provided',
        path: ['cfToken', 'catalystToken'],
    });

export type Token = z.infer<typeof TokenSchema>;
