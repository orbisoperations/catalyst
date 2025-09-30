import type { User } from '@catalyst/schema_zod/entities/user';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic'; // defaults to auto
import UserCredentialsCacheWorker from '@catalyst/user-credentials-cache/src';
import AuthxAuthzedApiWorker from '@catalyst/authx_authzed_api/src';
function getEnv() {
    return getCloudflareContext().env as CloudflareEnv;
}

function getUserCache() {
    return getEnv().USER_CREDS_CACHE as Service<UserCredentialsCacheWorker>;
}

function getAuthxAuthzed() {
    return getEnv().AUTHX_AUTHZED_API as Service<AuthxAuthzedApiWorker>;
}

export async function GET(request: NextRequest) {
    // get CF token
    const cfToken = request.cookies.get('CF_Authorization')?.value;
    if (cfToken) {
        // validate CF token
        const user_cache = getUserCache();
        const authxAuthzed = getAuthxAuthzed();
        const user: User | undefined = (await user_cache.getUser(cfToken)) as User | undefined;
        if (user) {
            // user role
            await authxAuthzed.addUserToOrg(user.orgId, user.userId);
            // data custodian role
            if (user.zitadelRoles.includes('data-custodian')) {
                await authxAuthzed.addDataCustodianToOrg(user.orgId, user.userId);
            }
            // admin role
            if (user.zitadelRoles.includes('org-admin')) {
                await authxAuthzed.addAdminToOrg(user.orgId, user.userId);
            }
        } else {
            return Response.json({ error: 'no user found' });
        }
        return Response.json({ token: cfToken });
    } else {
        return Response.json({ error: 'no token found' });
    }
}
