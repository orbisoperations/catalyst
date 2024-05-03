import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic"; // defaults to auto

export const runtime = "edge";
export async function GET(request: NextRequest) {
    // @ts-ignore
    const { AUTHX_TOKEN_API : tokenAPI } = getRequestContext()
    .env as CloudflareEnv;
  
    const jwk = await tokenAPI.getPublicKeyJWK()
    return Response.json(jwk)
}
