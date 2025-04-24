import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API } = getRequestContext()
    .env as CloudflareEnv;
  try {
    const data = await CATALYST_DATA_CHANNEL_REGISTRAR_API.list("default");
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
