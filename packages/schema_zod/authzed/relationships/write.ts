import { z } from 'zod';
import * as Catalyst  from "../../catalyst"
import {AuthzedObject} from "../"

export const WriteBody = z.object({
  updates: z.object({
    operation: z.enum(['OPERATION_TOUCH']),
    relationship: z.object({
      resource: AuthzedObject,
      relation: z.union([
        Catalyst.DataChannel.CatalystDataChannelEntitySubEntities,
        Catalyst.RoleEnum,
        Catalyst.Org.EntityEnum
      ]).optional(),
      subject: z.object({
        object: AuthzedObject
      })
    })
  }).array()
})

export type WriteBody = z.infer<typeof WriteBody>

export const WriteResult = z.object({
  writtenAt: z.object({
    token: z.string()
  }).optional(),
  code: z.number().optional(),
  message: z.string().optional()
})
export type WriteResult = z.infer<typeof WriteResult>