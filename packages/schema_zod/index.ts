import {z} from "zod"

/*
export type DataChannel = {
    id: string;
    accessSwitch: number | null;
    name: string;
    endpoint: string;
    description: string | null;
    creatorOrganization: string;
};
*/

export const DataChannel = z.object({
    id: z.string(),
    accessSwitch: z.boolean(),
    name: z.string(),
    endpoint: z.string(),
    description: z.string(),
    creatorOrganization: z.string(),
})

export type DataChannel = z.infer<typeof DataChannel>