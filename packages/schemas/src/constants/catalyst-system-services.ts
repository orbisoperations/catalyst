import { z } from 'zod/v4';

export const CatalystSystemServiceSchema = z.enum([
    'data-channel-certifier',
    'scheduled-validator',
    'gateway-single-use-token', // Service that creates single-use tokens for gateway to access individual data channels
]);
export type CatalystSystemService = z.infer<typeof CatalystSystemServiceSchema>;
