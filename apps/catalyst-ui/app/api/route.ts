import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API } = getRequestContext()
    .env as CloudflareEnv;
  try {
    await CATALYST_DATA_CHANNEL_REGISTRAR_API.create("org1", {
      name: "test",
      accessSwitch: true,
      endpoint: "test 1",
      description: "test 1",
      creatorOrganization: "test 1",
    });
    const resp2 = await CATALYST_DATA_CHANNEL_REGISTRAR_API.list("org1");
    return NextResponse.json({ res: resp2 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
