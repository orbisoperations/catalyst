import { z } from 'zod';
import * as Org from "../index"
export const EntityEnum = z.enum([
  "data_channel",
  "partner_organization"
])

export type  EntityEnum = z.infer<typeof EntityEnum>
/*
export const Entity = z.enum([
  "data_channel",
  "partner_organization"
])

export type  Entity = z.infer<typeof Entity>

export const CatalystOrgEntitySubEntities = z.union([Org.RoleEnum, Entity])
export type CatalystOrgEntitySubEntities = z.infer<typeof CatalystOrgEntitySubEntities>
*/