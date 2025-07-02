import { z } from 'zod';
import { defineResult } from '../helpers/result';

export const PermissionCheckResponse = z.object({
    success: z.boolean(),
    error: z.string().optional(),
});
export type PermissionCheckResponse = z.infer<typeof PermissionCheckResponse>;

export const PermissionCheckResult = defineResult(z.boolean());
export type PermissionCheckResult = z.infer<typeof PermissionCheckResult>;
