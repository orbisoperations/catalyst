import { z } from 'zod';
import { OrgId, UserId } from '../../types';
import * as Catalyst from '../index';

export const CatalystDataChannelEntityPermission = z.enum([
  "read"
])

export type CatalystDataChannelEntityPermission = z.infer<typeof CatalystDataChannelEntityPermission>

export const CatalystDataChannelEntitySubEntities = z.enum([
  "organization"
])

export type CatalystDataChannelEntitySubEntities = z.infer<typeof CatalystDataChannelEntitySubEntities>


export const CatalystOrgRelationship = z.object({
  orgId: OrgId,
  relation: Catalyst.RoleEnum,
  subject: UserId
})

export type CatalystOrgRelationship = z.infer<typeof CatalystOrgRelationship>
