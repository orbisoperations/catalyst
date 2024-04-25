import { cookies } from 'next/headers'
import { NextRequest } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages'
import { OrgId, UserId } from '../../../../../../../packages/schema_zod';
export const dynamic = 'force-dynamic' // defaults to auto

export const runtime = 'edge'
function getOrgFromRoles(
  roles: Record<string, Record<string, string>>
): string | undefined {
  const roleKeys = Object.keys(roles);
  const key = roleKeys.find(
    (key) =>
      key === "platform-admin" || key === "org-admin" || key === "org-user"
  ) as "platform-admin" | "org-admin" | "org-user" | undefined;

  if (!key) return undefined;

  if (roleKeys.includes(key)) {
    const role = roles[key];
    const orgKeys = Object.keys(role);
    if (orgKeys.length > 0) {
      const org = orgKeys[0];
      return role[org].split(".")[0];
    } else {
      return undefined;
    }
  }
}
export async function GET(request: NextRequest) {
  // get CF token
  const cfToken = request.cookies.get("CF_Authorization")?.value
  if (cfToken) {
    // validate CF token
    const {USER_CREDS_CACHE: user_cache} = getRequestContext().env as CloudflareEnv
    const user: {userId: string, orgId: string} | undefined = user_cache.getUser(cfToken)
    if (user) {
      const writeResp = await getRequestContext().env.AUTHX_AUTHZED_API.addUserToOrg(user.orgId, user.userId)
      console.log("completed user sync", writeResp)
    } else {
      console.error("user or org is undefined")
    }
  }

  return Response.json({endpoint: "user-sync"})
}