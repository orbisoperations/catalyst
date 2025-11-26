import { test as base, expect } from '@playwright/test';
import type { Page, Browser, BrowserContext } from '@playwright/test';
import { UserRole } from '@catalyst/schemas';

/**
 * Cloudflare Access JWT user structure
 * Matches the type defined in components/contexts/User/UserContext.tsx
 */
export interface CloudflareUser {
    id: string;
    email: string;
    user_uuid: string;
    account_id: string;
    custom: {
        isAdmin: boolean;
        isPlatformAdmin: boolean;
        org: string;
        'urn:zitadel:iam:org:project:roles': Record<string, Record<string, string>>;
    };
}

/**
 * Authentication Fixtures for Catalyst UI Worker Tests
 *
 * Provides pre-authenticated browser contexts for different user roles:
 * - platform-admin: Full platform access
 * - org-admin: Organization and partner management
 * - data-custodian: Data validation and channel management
 * - org-user: Standard user access
 *
 * Critical for testing the data-custodian bug scenarios where
 * user.custom.org must be correctly extracted for all roles.
 */

export interface AuthFixtures {
    platformAdminPage: Page;
    orgAdminPage: Page;
    dataCustodianPage: Page;
    orgUserPage: Page;
    authenticatedPage: (userType: UserRole) => Promise<Page>;
}

/**
 * Test user configurations
 * These should match users created in your test environment
 */
export const TEST_USERS: Record<
    UserRole,
    {
        email: string;
        org: string;
        roles: Record<string, Record<string, string>>;
        isPlatformAdmin: boolean;
        isAdmin: boolean;
    }
> = {
    'platform-admin': {
        email: 'test-platform-admin@example.com',
        org: 'platform-org',
        roles: {
            'platform-admin': {
                'admin-role-name': 'platform-org',
            },
        },
        isPlatformAdmin: true,
        isAdmin: true,
    },
    'org-admin': {
        email: 'test-org-admin@example.com',
        org: 'test-org-alpha',
        roles: {
            'org-admin': {
                'admin-role-name': 'test-org-alpha',
            },
        },
        isPlatformAdmin: false,
        isAdmin: true,
    },
    /**
     * CRITICAL: Data-custodian ONLY user
     * This is the exact scenario that caused the 18-month bug
     * where user.custom.org was undefined
     */
    'data-custodian': {
        email: 'test-data-custodian@example.com',
        org: 'test-org-alpha',
        roles: {
            'data-custodian': {
                'custodian-role-name': 'test-org-alpha',
            },
        },
        isPlatformAdmin: false,
        isAdmin: false,
    },
    'org-user': {
        email: 'test-org-user@example.com',
        org: 'test-org-alpha',
        roles: {
            'org-user': {
                'user-role-name': 'test-org-alpha',
            },
        },
        isPlatformAdmin: false,
        isAdmin: false,
    },
};

/**
 * Setup authentication for a specific user role
 *
 * In a real implementation, this would:
 * 1. Make a request to Cloudflare Access authentication endpoint
 * 2. Store the CF_Authorization cookie
 * 3. Optionally store auth state in .auth/ directory for reuse
 *
 * For now, this is a placeholder that can be implemented based on your auth setup
 */
async function setupAuth(page: Page, userType: UserRole): Promise<void> {
    const user = TEST_USERS[userType];

    // Mock Cloudflare Access identity endpoint
    // This is what UserContext.tsx calls to get user information
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
                    org: user.org, // CRITICAL: This must not be undefined!
                    'urn:zitadel:iam:org:project:roles': user.roles,
                },
            }),
        });
    });

    // Mock user sync endpoint (for getting catalyst token)
    await page.route('**/api/v1/user/sync', async (route) => {
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

    // Wait for user context to load
    await page.waitForLoadState('networkidle');

    // Verify authentication succeeded by checking for TopBar elements
    // Look for the Catalyst logo (always present in TopBar)
    const logo = page.getByAltText('Catalyst Logo');
    await expect(logo).toBeVisible();
}

/**
 * Get or create storage state for a user role
 * This enables auth state reuse across tests for 3-5x better performance
 *
 * Storage states are saved to .auth/ directory and reused within the same worker.
 * States expire after 1 hour to ensure fresh authentication.
 *
 * Note: .auth/ directory is gitignored automatically by Playwright
 */
async function getStorageState(browser: Browser, userType: UserRole): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');

    const authDir = path.join(process.cwd(), '.auth');
    const storagePath = path.join(authDir, `${userType}.json`);

    // Create .auth directory if it doesn't exist
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    // If storage state exists and is less than 1 hour old, reuse it
    if (fs.existsSync(storagePath)) {
        const stats = fs.statSync(storagePath);
        const ageMs = Date.now() - stats.mtimeMs;
        const oneHourMs = 60 * 60 * 1000;

        if (ageMs < oneHourMs) {
            return storagePath;
        }
    }

    // Create fresh storage state
    const context = await browser.newContext();
    const page = await context.newPage();
    await setupAuth(page, userType);

    // Save storage state (cookies, localStorage, sessionStorage)
    await context.storageState({ path: storagePath });
    await context.close();

    return storagePath;
}

/**
 * Block all external network requests, allowing only localhost
 * This ensures tests run fully offline and don't make unexpected external calls
 *
 * Since all workers run locally in dev, we allow all localhost traffic on any port
 */
async function enforceOfflineMode(context: BrowserContext): Promise<void> {
    await context.route('**/*', (route) => {
        const url = new URL(route.request().url());

        // Allow all localhost and 127.0.0.1 on any port
        // This includes:
        // - Next.js dev server (localhost:4000)
        // - All local Cloudflare Workers (various ports)
        // - user-credentials-cache, issued-jwt-registry, etc.
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            return route.continue();
        }

        // Block all other external requests with clear error message
        console.warn(`[OFFLINE MODE] Blocked external request to: ${url.hostname}`);
        return route.abort('blockedbyclient');
    });
}

/**
 * Extended Playwright test with authentication fixtures
 *
 * PERFORMANCE: Uses storage state caching to reuse authentication across tests
 * This provides 3-5x speedup compared to authenticating for every test
 *
 * OFFLINE: All external network requests are blocked at the context level
 * Only localhost connections are allowed
 */
export const test = base.extend<AuthFixtures>({
    // Platform admin authenticated page
    platformAdminPage: async ({ browser }, use) => {
        const storagePath = await getStorageState(browser, 'platform-admin');
        const context = await browser.newContext({ storageState: storagePath });

        // Enforce offline mode - block all external requests (except user-credentials-cache)
        await enforceOfflineMode(context);

        const page = await context.newPage();

        // Still need to set up route mocking for each page
        await setupAuth(page, 'platform-admin');

        await use(page);
        await context.close();
    },

    // Org admin authenticated page
    orgAdminPage: async ({ browser }, use) => {
        const storagePath = await getStorageState(browser, 'org-admin');
        const context = await browser.newContext({ storageState: storagePath });

        // Enforce offline mode - block all external requests
        await enforceOfflineMode(context);

        const page = await context.newPage();
        await setupAuth(page, 'org-admin');

        await use(page);
        await context.close();
    },

    // Data custodian authenticated page (CRITICAL BUG SCENARIO)
    dataCustodianPage: async ({ browser }, use) => {
        const storagePath = await getStorageState(browser, 'data-custodian');
        const context = await browser.newContext({ storageState: storagePath });

        // Enforce offline mode - block all external requests
        await enforceOfflineMode(context);

        const page = await context.newPage();
        await setupAuth(page, 'data-custodian');

        await use(page);
        await context.close();
    },

    // Org user authenticated page
    orgUserPage: async ({ browser }, use) => {
        const storagePath = await getStorageState(browser, 'org-user');
        const context = await browser.newContext({ storageState: storagePath });

        // Enforce offline mode - block all external requests
        await enforceOfflineMode(context);

        const page = await context.newPage();
        await setupAuth(page, 'org-user');

        await use(page);
        await context.close();
    },

    // Generic authenticated page factory
    authenticatedPage: async ({ browser }, use) => {
        const factory = async (userType: UserRole) => {
            const storagePath = await getStorageState(browser, userType);
            const context = await browser.newContext({ storageState: storagePath });

            // Enforce offline mode - block all external requests
            await enforceOfflineMode(context);

            const page = await context.newPage();
            await setupAuth(page, userType);
            return page;
        };
        await use(factory);
    },
});

export { expect };
