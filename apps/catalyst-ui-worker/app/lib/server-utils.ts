import { cookies } from 'next/headers';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { CloudflareEnv } from '@catalyst/schemas';

export function getCloudflareEnv(): CloudflareEnv {
    return getCloudflareContext().env as CloudflareEnv;
}

export async function getCFAuthorizationToken(): Promise<string> {
    const token = (await cookies()).get('CF_Authorization')?.value;
    if (!token) {
        throw new Error('Unauthorized: No CF_Authorization cookie found');
    }
    return token;
}
