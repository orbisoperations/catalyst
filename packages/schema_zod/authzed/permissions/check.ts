import { z } from 'zod';

export const CheckError = z.object({
    code: z.number(),
    message: z.string(),
    details: z
        .object({
            '@type': z.string().optional(),
            eiusmod93: z.object({}).optional(),
            labore2e: z.object({}).optional(),
            in_81a: z.object({}).optional(),
        })
        .array(),
});

export const PermissionValues = z.enum(['PERMISSIONSHIP_HAS_PERMISSION', 'PERMISSIONSHIP_NO_PERMISSION']);

export type PermissionValues = z.infer<typeof PermissionValues>;
export const CheckReponse = z.object({
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
    debugTrace: z.any().nullable().optional(),
    optionalExpiresAt: z.any().nullable().optional(),
});

export const Response = z.union([CheckReponse, CheckError]);

export type CheckReponse = z.infer<typeof CheckReponse>;
export type CheckError = z.infer<typeof CheckError>;
export type Response = z.infer<typeof Response>;
