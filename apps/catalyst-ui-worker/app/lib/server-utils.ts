import { cookies } from 'next/headers';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { CloudflareEnv, getUserCache, type User } from '@catalyst/schemas';

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

export async function getAuthenticatedUser(): Promise<User | null> {
    let cfToken: string;
    try {
        cfToken = await getCFAuthorizationToken();
    } catch {
        return null; // No cookie present
    }
    const userCache = getUserCache(getCloudflareEnv());
    return (await userCache.getUser(cfToken)) as User | null;
}
