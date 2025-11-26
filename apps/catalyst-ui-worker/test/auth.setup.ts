import { test as setup } from '@playwright/test';
import { UserRole } from '@catalyst/schemas';
import { TEST_USERS, AUTH_FILES } from './auth.constants';

/**
 * Playwright Auth Setup
 *
 * This file runs ONCE before all test projects to set up authentication state.
 * Each user role gets its own storage state file that tests can reuse.
 *
 * Benefits:
 * - No race conditions (runs serially before tests)
 * - Auth happens once per role, not per test
 * - Tests just load the saved state (fast)
 */

/**
 * Setup authentication for a specific user role
 */
async function setupAuthForRole(page: import('@playwright/test').Page, userType: UserRole): Promise<void> {
    const user = TEST_USERS[userType];

    // Set CF_Authorization cookie that mock-user-credentials-cache expects
    await page.context().addCookies([
        {
            name: 'CF_Authorization',
            value: `test-token-${userType}`,
            domain: 'localhost',
            path: '/',
        },
    ]);

    // Mock Cloudflare Access identity endpoint
    await page.route('**/cdn-cgi/access/get-identity', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: `user-${userType}`,
                email: user.email,
                user_uuid: `uuid-${userType}`,
                account_id: 'test-account',
                amr: [],
                idp: { id: 'test-idp', type: 'test' },
                geo: { country: 'US' },
                iat: Date.now(),
                ip: '127.0.0.1',
                auth_status: 'NONE',
                common_name: user.email,
                service_token_id: '',
                service_token_status: false,
                is_warp: false,
                is_gateway: false,
                version: 1,
                device_sessions: {},
                custom: {
                    isAdmin: user.isAdmin,
                    isPlatformAdmin: user.isPlatformAdmin,
                    org: user.org,
                    'urn:zitadel:iam:org:project:roles': user.roles,
                },
            }),
        });
    });

    // Mock user sync endpoint
    await page.route('**/api/v1/user/sync', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                token: `test-token-${userType}`,
            }),
        });
    });

    // Navigate to trigger authentication
    await page.goto('/');
    await page.waitForLoadState('networkidle');
}

// Setup for platform-admin
setup('authenticate as platform-admin', async ({ page }) => {
    await setupAuthForRole(page, 'platform-admin');
    await page.context().storageState({ path: AUTH_FILES['platform-admin'] });
});

// Setup for org-admin
setup('authenticate as org-admin', async ({ page }) => {
    await setupAuthForRole(page, 'org-admin');
    await page.context().storageState({ path: AUTH_FILES['org-admin'] });
});

// Setup for data-custodian
setup('authenticate as data-custodian', async ({ page }) => {
    await setupAuthForRole(page, 'data-custodian');
    await page.context().storageState({ path: AUTH_FILES['data-custodian'] });
});

// Setup for org-user
setup('authenticate as org-user', async ({ page }) => {
    await setupAuthForRole(page, 'org-user');
    await page.context().storageState({ path: AUTH_FILES['org-user'] });
});
