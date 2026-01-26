import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import { getUserCache } from '@catalyst/schemas';
import { getCloudflareEnv } from '@/app/lib/server-utils';

export async function POST(request: NextRequest) {
    const cfToken = request.cookies.get('CF_Authorization')?.value;

    if (!cfToken) {
        return Response.json({ error: 'no token found' }, { status: 401 });
    }

    const env = getCloudflareEnv();
    const envRecord = env as unknown as Record<string, unknown>;

    // Get Zitadel config from environment vars
    const zitadelDomain = envRecord.ZITADEL_DOMAIN as string | undefined;
    const zitadelClientId = envRecord.ZITADEL_CLIENT_ID as string | undefined;
    const cfTeamDomain = envRecord.CF_ACCESS_TEAM_DOMAIN as string | undefined;

    // Construct CF Access logout URL (must be absolute for OIDC redirect)
    const cfLogoutUrl = cfTeamDomain
        ? `https://${cfTeamDomain}.cloudflareaccess.com/cdn-cgi/access/logout`
        : `${new URL(request.url).origin}/cdn-cgi/access/logout`;

    // Construct Zitadel logout URL (redirects to CF Access logout after)
    let logoutUrl = cfLogoutUrl;
    if (zitadelDomain && zitadelClientId) {
        const params = new URLSearchParams({
            client_id: zitadelClientId,
            post_logout_redirect_uri: cfLogoutUrl,
        });
        logoutUrl = `https://${zitadelDomain}/oidc/v1/end_session?${params}`;
    }

    let cacheCleared = false;
    try {
        const userCache = getUserCache(env);
        cacheCleared = await userCache.deleteUser(cfToken);
    } catch (error) {
        // deleteUser may not be deployed yet - log but don't fail
        console.error('Error clearing user cache on logout:', error);
    }

    return Response.json({
        success: true,
        cacheCleared,
        logoutUrl,
    });
}
