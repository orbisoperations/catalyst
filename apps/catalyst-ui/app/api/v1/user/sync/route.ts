import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic"; // defaults to auto

export const runtime = "edge";
export async function GET(request: NextRequest) {
  // get CF token
  const cfToken = request.cookies.get("CF_Authorization")?.value;
  if (cfToken) {
    // validate CF token
    // @ts-ignore
    const { USER_CREDS_CACHE: user_cache } = getRequestContext()
      .env as CloudflareEnv;
    const user:
      | { userId: string; orgId: string; zitadelRoles: string[] }
      | undefined = await user_cache.getUser(cfToken);
    if (user) {
      const writeResp =
        // @ts-ignore
        await getRequestContext().env.AUTHX_AUTHZED_API.addUserToOrg(
          user.orgId,
          user.userId
        );
      if (user.zitadelRoles.includes("org-admin")) {
        // @ts-ignore
        await getRequestContext().env.AUTHX_AUTHZED_API.addAdminToOrg(
          user.orgId,
          user.userId
        );
      }
    } else {
      return Response.json({ error: "no user found" });
    }
    return Response.json({ token: cfToken });
  } else {
    return Response.json({ error: "no token found" });
  }
}
