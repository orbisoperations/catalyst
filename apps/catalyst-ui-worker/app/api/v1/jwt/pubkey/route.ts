import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic'; // defaults to auto
import { getTokenAPI } from '@catalyst/schemas';
import { getCloudflareEnv } from '@/app/lib/server-utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
    const env = getCloudflareEnv();
    const tokenAPI = getTokenAPI(env);

    const publicKey: { pem: string } = await tokenAPI.getPublicKey();
    return Response.json(publicKey);
}
