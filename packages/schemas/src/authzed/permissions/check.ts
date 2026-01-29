import { z } from 'zod/v4';

export const PermissionValues = z.enum([
    'PERMISSIONSHIP_HAS_PERMISSION',
    'PERMISSIONSHIP_NO_PERMISSION',
    'PERMISSIONSHIP_CONDITIONAL_PERMISSION',
]);
export type PermissionValues = z.infer<typeof PermissionValues>;

export const CheckResponse = z.object({
    permissionship: PermissionValues,
    checkedAt: z.union([z.string(), z.object({ token: z.string() })]).optional(),
});
export type CheckResponse = z.infer<typeof CheckResponse>;

export const CheckError = z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()).optional(),
});
export type CheckError = z.infer<typeof CheckError>;

export const Response = z.union([CheckResponse, CheckError]);
export type Response = z.infer<typeof Response>;
