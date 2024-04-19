import { z } from 'zod';

export * from "./entity"

export const CatalystDataChannelEntityPermission = z.enum([
  "read"
])

export type CatalystDataChannelEntityPermission = z.infer<typeof CatalystDataChannelEntityPermission>


