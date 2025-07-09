import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
    const { CATALYST_DATA_CHANNEL_REGISTRAR_API } = getCloudflareContext().env as CloudflareEnv;
    try {
        // Setting cfToken to undefined to avoid the error, was not originally provided
        const data = await CATALYST_DATA_CHANNEL_REGISTRAR_API.list('default', { cfToken: undefined });
        return NextResponse.json(data);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
