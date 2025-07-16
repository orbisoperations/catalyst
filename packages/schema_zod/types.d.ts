import { z } from 'zod';
export declare const DataChannel: z.ZodObject<
    {
        id: z.ZodString;
        accessSwitch: z.ZodBoolean;
        name: z.ZodString;
        endpoint: z.ZodString;
        description: z.ZodString;
        creatorOrganization: z.ZodString;
    },
    'strip',
    z.ZodTypeAny,
    {
        id: string;
        accessSwitch: boolean;
        name: string;
        endpoint: string;
        description: string;
        creatorOrganization: string;
    },
    {
        id: string;
        accessSwitch: boolean;
        name: string;
        endpoint: string;
        description: string;
        creatorOrganization: string;
    }
>;
export type DataChannel = z.infer<typeof DataChannel>;
export declare const OrgId: z.ZodString;
export type OrgId = z.infer<typeof OrgId>;
export declare const UserId: z.ZodString;
export type UserId = z.infer<typeof UserId>;
export declare const DataChannelId: z.ZodString;
export type DataChannelId = z.infer<typeof DataChannelId>;
//# sourceMappingURL=types.d.ts.map
