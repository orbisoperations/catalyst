import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic'; // defaults to auto
import { CloudflareEnv, getTokenAPI } from '@catalyst/schemas';

function getEnv(): CloudflareEnv {
    return getCloudflareContext().env as CloudflareEnv;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
    const env = getEnv();
    const tokenAPI = getTokenAPI(env);
    const jwk = await tokenAPI.getPublicKeyJWK();
    return Response.json(jwk);
}
