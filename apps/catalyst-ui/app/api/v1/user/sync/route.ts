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
    // curl -H 'cookie: CF_Authorization=<user-token>' https://<your-team-name>.cloudflareaccess.com/cdn-cgi/access/get-identity
    const resp = await fetch(
      'https://orbisops.cloudflareaccess.com/cdn-cgi/access/get-identity',
      {
        method: "GET",
        headers: {
          cookie: `CF_Authorization=${cfToken}`
        }
      }
    )

    const cfUser = await resp.json() as {email: string, custom: Record<string, Record<string, Record< string,string>>>}
    const user: string = cfUser.email
    const org: string | undefined = getOrgFromRoles(cfUser.custom['urn:zitadel:iam:org:project:roles'])

    console.log("verified user attribs", user, org)

    // make call to Authzed to add user to org
    if (user && org) {
      const writeResp = await getRequestContext().env.AUTHX_AUTHZED_API.addUserToOrg(org, user)
      console.log("completed user sync", writeResp)
    } else {
      console.error("user or org is undefined")
    }

  } else {
    console.error("no token provided and cannot sync user")
  }

  return Response.json({endpoint: "user-sync"})
}