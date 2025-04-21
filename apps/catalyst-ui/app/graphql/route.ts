import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API } = getCloudflareContext()
    .env as CloudflareEnv;
  try {
    const data = await CATALYST_DATA_CHANNEL_REGISTRAR_API.list("default");
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
