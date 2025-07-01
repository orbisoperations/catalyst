import { z } from 'zod';
import { defineResult } from '../helpers/result';

export const Token = z.object({
    cfToken: z.string().optional(),
    catalystToken: z.string().optional(),
});
export type Token = z.infer<typeof Token>;

export const TokenResult = defineResult(Token);
export type TokenResult = z.infer<typeof TokenResult>;
