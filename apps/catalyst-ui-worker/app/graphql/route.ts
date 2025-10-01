import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest, NextResponse } from 'next/server';
import { CloudflareEnv, getRegistrar } from '@catalyst/schemas';

function getEnv(): CloudflareEnv {
    return getCloudflareContext().env as CloudflareEnv;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
    const env = getEnv();
    const dataChannelRegistrar = getRegistrar(env);
    try {
        // Setting cfToken to undefined to avoid the error, was not originally provided
        const data = await dataChannelRegistrar.list('default', { cfToken: undefined });
        return NextResponse.json(data);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
