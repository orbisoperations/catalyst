import { z } from 'zod';

export const CheckError = z.object({
    code: z.number(),
    message: z.string(),
    details: z
        .object({
            '@type': z.string().optional(),
        })
        .array(),
});

export const PermissionValues = z.enum(['PERMISSIONSHIP_HAS_PERMISSION', 'PERMISSIONSHIP_NO_PERMISSION']);

export type PermissionValues = z.infer<typeof PermissionValues>;
export const CheckResponse = z.object({
    checkedAt: z.object({
        token: z.string(),
    }),
    permissionship: PermissionValues,
    partialCaveatInfo: z
        .object({
            missingRequiredContext: z.string().array(),
        })
        .nullish()
        .optional(),
});

export const Response = z.union([CheckResponse, CheckError]);

export type CheckResponse = z.infer<typeof CheckResponse>;
export type CheckError = z.infer<typeof CheckError>;
export type Response = z.infer<typeof Response>;
