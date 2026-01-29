import { NextRequest, NextResponse } from 'next/server';
import { getRegistrar } from '@catalyst/schemas';
import { getCloudflareEnv } from '@/app/lib/server-utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
    const env = getCloudflareEnv();
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
