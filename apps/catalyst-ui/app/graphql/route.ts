import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API } = getRequestContext()
    .env as CloudflareEnv;
  try {
    return await CATALYST_DATA_CHANNEL_REGISTRAR_API.fetch(
      "http://supersecurewoker/graphql",
      {
        method: req.method,
        body: req.body,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
