import { z } from 'zod/v4';

// JWT Registry status enum
export const JWTRegisterStatusEnum = z.enum(['active', 'revoked', 'deleted', 'expired']);
// Note: JWTRegisterStatus type is exported from domains/registry to avoid conflicts

// Organization invite status enum
export const OrgInviteStatusEnum = z.enum(['pending', 'accepted', 'declined']);
// Note: Type is exported from domains/organization/invites to avoid conflicts
