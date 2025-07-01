import { z } from 'zod';
import { defineResult } from '../helpers/result';

export const JWTRotateResult = defineResult(z.object({}));
export type JWTRotateResult = z.infer<typeof JWTRotateResult>;

// compatibility union form
export const JWTRotateResponse = z.discriminatedUnion('success', [
    z.object({ success: z.literal(true) }),
    z.object({ success: z.literal(false), error: z.string() }),
]);
export type JWTRotateResponse = z.infer<typeof JWTRotateResponse>;
