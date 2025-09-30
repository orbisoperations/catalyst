import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic'; // defaults to auto
import AuthxTokenApiWorker from '@catalyst/authx_token_api/src';
function getEnv() {
    return getCloudflareContext().env as CloudflareEnv;
}

function getAuthx() {
    return getEnv().AUTHX_TOKEN_API as Service<AuthxTokenApiWorker>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
    const tokenAPI = getAuthx();

    const publicKey: { pem: string } = await tokenAPI.getPublicKey();
    return Response.json(publicKey);
}
