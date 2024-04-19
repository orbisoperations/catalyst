import { z } from 'zod';

export * from "../types"
export * as Relationships from "./relationships"
export * as Permissions from "./permissions"


import * as Catalyst from "../catalyst"

export const AuthzedObject = z.object({
  objectType: Catalyst.EntityString,
  objectId: z.string()
})