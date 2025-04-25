import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic"; // defaults to auto

export async function GET(request: NextRequest) {
    // @ts-ignore
    const { AUTHX_TOKEN_API : tokenAPI } = getCloudflareContext()
    .env as CloudflareEnv;
  
    const jwk = await tokenAPI.getPublicKeyJWK()
    return Response.json(jwk)
}
