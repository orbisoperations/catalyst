import { z } from 'zod';
import * as Catalyst from "../../catalyst"
import {AuthzedObject} from "../"

export const ReadResult = z.object({
  result: z.object({
    readAt: z.object({
      token: z.string()
    }),
    relationship: z.object({
      resource: AuthzedObject,
      relation: Catalyst.DataChannel.EntityEnum.or(Catalyst.Org.EntityEnum),
      subject: z.object({
        object: AuthzedObject,
        optionalRelation: z.string().optional()
      }),
      optionalCaveat: z.object({
        caveatName: z.string(),
        context: z.string()
      }).optional()
    })
  }),
  error: z.object({
    code: z.string(),
    message: z.string()
  })
})
export type ReadResult = z.infer<typeof ReadResult>