export const dynamic = 'force-dynamic';
import { getAuthzed } from '@catalyst/schemas';
import { getCloudflareEnv, getAuthenticatedUser } from '@/app/lib/server-utils';

export async function GET() {
    const user = await getAuthenticatedUser();
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sync user roles to authzed
    const authzed = getAuthzed(getCloudflareEnv());
    await authzed.addUserToOrg(user.orgId, user.userId);
    if (user.zitadelRoles.includes('data-custodian')) {
        await authzed.addDataCustodianToOrg(user.orgId, user.userId);
    }
    if (user.zitadelRoles.includes('org-admin')) {
        await authzed.addAdminToOrg(user.orgId, user.userId);
    }

    return Response.json({
        userId: user.userId,
        orgId: user.orgId,
        roles: user.zitadelRoles,
        isAdmin: user.zitadelRoles.includes('org-admin'),
        isPlatformAdmin: user.zitadelRoles.includes('platform-admin'),
    });
}
