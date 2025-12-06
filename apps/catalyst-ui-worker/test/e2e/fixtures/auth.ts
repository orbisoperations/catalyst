import { test as base, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';
import { UserRole } from '@catalyst/schemas';
import { TEST_USERS, AUTH_FILES, ALL_TEST_USERS, ExtendedUserType } from '../../auth.constants';

/**
 * Authentication Fixtures for Catalyst UI Worker Tests
 *
 * These fixtures provide pre-authenticated browser contexts for different user roles.
 * Auth state is created once by auth.setup.ts and reused here via storageState.
 *
 * User roles:
 * - platform-admin: Full platform access (can rotate keys)
 * - org-admin: Organization and partner management (test-org-alpha)
 * - org-admin-beta: Organization admin for test-org-beta (cross-org testing)
 * - data-custodian: Data validation and channel management
 * - org-user: Standard user access
 */

export interface AuthFixtures {
    platformAdminPage: Page;
    orgAdminPage: Page;
    orgAdminBetaPage: Page;
    dataCustodianPage: Page;
    orgUserPage: Page;
    authenticatedPage: (userType: UserRole) => Promise<Page>;
    authenticatedPageExtended: (userType: ExtendedUserType) => Promise<Page>;
}

/**
 * Setup route mocking for a specific user role
 * This is called after loading storageState to ensure routes are mocked correctly
 */
async function setupRouteMocking(page: Page, userType: ExtendedUserType): Promise<void> {
    const user = ALL_TEST_USERS[userType];

    // Mock Cloudflare Access identity endpoint
    await page.route('**/cdn-cgi/access/get-identity', async (route) => {
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
    await page.route('**/api/v1/user/sync', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                token: `test-token-${userType}`,
            }),
        });
    });
}

/**
 * Block all external network requests, allowing only localhost
 */
async function enforceOfflineMode(context: BrowserContext): Promise<void> {
    await context.route('**/*', (route) => {
        const url = new URL(route.request().url());

        // Allow all localhost and 127.0.0.1 on any port
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            return route.continue();
        }

        // Block all other external requests
        console.warn(`[OFFLINE MODE] Blocked external request to: ${url.hostname}`);
        return route.abort('blockedbyclient');
    });
}

/**
 * Create page fixture for a specific user role
 */
async function createPageForRole(
    browser: import('@playwright/test').Browser,
    userType: ExtendedUserType
): Promise<{ page: Page; context: BrowserContext }> {
    const context = await browser.newContext({
        storageState: AUTH_FILES[userType],
    });

    await enforceOfflineMode(context);

    const page = await context.newPage();
    await setupRouteMocking(page, userType);

    // Navigate to trigger auth context loading
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    return { page, context };
}

/**
 * Extended Playwright test with authentication fixtures
 *
 * Uses the auth setup project pattern for reliable authentication.
 * Storage state is created once by auth.setup.ts and reused here.
 */
export const test = base.extend<AuthFixtures>({
    // Platform admin authenticated page
    platformAdminPage: async ({ browser }, use) => {
        const { page, context } = await createPageForRole(browser, 'platform-admin');
        await use(page);
        await context.close();
    },

    // Org admin authenticated page (test-org-alpha)
    orgAdminPage: async ({ browser }, use) => {
        const { page, context } = await createPageForRole(browser, 'org-admin');
        await use(page);
        await context.close();
    },

    // Org admin beta authenticated page (test-org-beta) - for cross-org testing
    orgAdminBetaPage: async ({ browser }, use) => {
        const { page, context } = await createPageForRole(browser, 'org-admin-beta');
        await use(page);
        await context.close();
    },

    // Data custodian authenticated page
    dataCustodianPage: async ({ browser }, use) => {
        const { page, context } = await createPageForRole(browser, 'data-custodian');
        await use(page);
        await context.close();
    },

    // Org user authenticated page
    orgUserPage: async ({ browser }, use) => {
        const { page, context } = await createPageForRole(browser, 'org-user');
        await use(page);
        await context.close();
    },

    // Generic authenticated page factory (standard UserRole only)
    authenticatedPage: async ({ browser }, use) => {
        const contexts: BrowserContext[] = [];

        const factory = async (userType: UserRole) => {
            const { page, context } = await createPageForRole(browser, userType);
            contexts.push(context);
            return page;
        };

        await use(factory);

        // Clean up all created contexts
        await Promise.all(contexts.map((ctx) => ctx.close()));
    },

    // Extended authenticated page factory (includes cross-org users)
    authenticatedPageExtended: async ({ browser }, use) => {
        const contexts: BrowserContext[] = [];

        const factory = async (userType: ExtendedUserType) => {
            const { page, context } = await createPageForRole(browser, userType);
            contexts.push(context);
            return page;
        };

        await use(factory);

        // Clean up all created contexts
        await Promise.all(contexts.map((ctx) => ctx.close()));
    },
});

export { expect };

// Export TEST_USERS and ALL_TEST_USERS for use in tests that need user info
export { TEST_USERS, ALL_TEST_USERS };
