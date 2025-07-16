import type { User } from '@catalyst/schema_zod/entities/user';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic'; // defaults to auto

export async function GET(request: NextRequest) {
    // get CF token
    const cfToken = request.cookies.get('CF_Authorization')?.value;
    if (cfToken) {
        // validate CF token
        const { USER_CREDS_CACHE: user_cache } = getCloudflareContext().env as CloudflareEnv;
        const user: User | undefined = (await user_cache.getUser(cfToken)) as User | undefined;
        if (user) {
            // user role
            await getCloudflareContext().env.AUTHX_AUTHZED_API.addUserToOrg(user.orgId, user.userId);
            // data custodian role
            if (user.zitadelRoles.includes('data-custodian')) {
                await getCloudflareContext().env.AUTHX_AUTHZED_API.addDataCustodianToOrg(user.orgId, user.userId);
            }
            // admin role
            if (user.zitadelRoles.includes('org-admin')) {
                await getCloudflareContext().env.AUTHX_AUTHZED_API.addAdminToOrg(user.orgId, user.userId);
            }
        } else {
            return Response.json({ error: 'no user found' });
        }
        return Response.json({ token: cfToken });
    } else {
        return Response.json({ error: 'no token found' });
    }
}
