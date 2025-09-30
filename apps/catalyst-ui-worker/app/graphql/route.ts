import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest, NextResponse } from 'next/server';
import DataChannelRegistrarWorker from '@catalyst/data_channel_registrar/src/worker';
function getEnv() {
    return getCloudflareContext().env as CloudflareEnv;
}

function getDataChannelRegistrar() {
    return getEnv().CATALYST_DATA_CHANNEL_REGISTRAR_API as Service<DataChannelRegistrarWorker>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
    const dataChannelRegistrar = getDataChannelRegistrar();
    try {
        // Setting cfToken to undefined to avoid the error, was not originally provided
        const data = await dataChannelRegistrar.list('default', { cfToken: undefined });
        return NextResponse.json(data);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
