import { test, expect, Page } from './fixtures/auth';
import { NAVBAR } from './utils/test-id-constants';

/**
 * Logout Functionality E2E Tests
 *
 * Tests that logout properly clears:
 * - localStorage (org key persisting between sessions)
 * - Browser session state
 * - Cross-browser compatibility (Chrome, Safari, Firefox)
 *
 * Root cause of bug: localStorage['org'] was never cleared on logout,
 * causing users to be returned to their previous workspace after re-login.
 */

/**
 * Mock Cloudflare Access logout endpoint
 * Real behavior: CF Access clears CF_Authorization cookie and redirects to login
 *
 * Note: WebKit doesn't support route.fulfill with 302 status, so we use a
 * JavaScript redirect in the response body instead.
 */
async function mockCloudflareAccessLogout(page: Page) {
    // Mock the logout API to return a localhost-relative URL
    // Without this, the real backend returns an external Zitadel OIDC URL
    // which gets blocked by enforceOfflineMode in the auth fixture
    await page.route('**/api/v1/user/logout', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                cacheCleared: true,
                logoutUrl: '/cdn-cgi/access/logout',
            }),
        });
    });

    await page.route('**/cdn-cgi/access/logout', async (route) => {
        // WebKit doesn't support 302 in route.fulfill, use JS redirect instead
        await route.fulfill({
            status: 200,
            contentType: 'text/html',
            headers: {
                'Set-Cookie': 'CF_Authorization=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
            },
            body: `<!DOCTYPE html>
                <html>
                <head>
                    <title>Logging out...</title>
                    <script>window.location.href = '/cdn-cgi/access/login';</script>
                </head>
                <body>Redirecting to login...</body>
                </html>`,
        });
    });

    await page.route('**/cdn-cgi/access/login', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `<!DOCTYPE html>
                <html>
                <head><title>Login</title></head>
                <body>
                    <h1>Sign in</h1>
                    <p>Select your identity provider to continue.</p>
                </body>
                </html>`,
        });
    });
}

/**
 * Click the logout button in the navbar
 */
async function clickLogout(page: Page) {
    const profileArea = page.getByTestId(NAVBAR.PROFILE_BUTTON);
    await profileArea.locator('button').first().click();
    const logoutButton = page.getByRole('menuitem', { name: 'Logout' });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();
}

test.describe('Logout Functionality', () => {
    test('logout clears localStorage org key', async ({ orgAdminPage: page }) => {
        // Verify we're logged in and org is set
        await expect(page.getByTestId(NAVBAR.USER_ORG_NAME)).toBeVisible();

        // Verify localStorage has org value before logout
        const initialOrg = await page.evaluate(() => localStorage.getItem('org'));
        expect(initialOrg).not.toBeNull();

        // Mock CF Access so we can complete the logout flow
        await mockCloudflareAccessLogout(page);

        // Click logout - the APP should clear localStorage before redirecting
        await clickLogout(page);

        // Wait for redirect to login page
        await page.waitForURL('**/cdn-cgi/access/login');

        // Verify the APP cleared localStorage (not us manually)
        const orgAfterLogout = await page.evaluate(() => localStorage.getItem('org'));
        expect(orgAfterLogout).toBeNull();
    });

    test('logout clears all auth-related storage keys but preserves preferences', async ({ orgAdminPage: page }) => {
        // Set up: add user preferences alongside auth keys
        await page.evaluate(() => {
            localStorage.setItem('userPreferences', '{"theme":"dark"}');
        });

        // Verify initial state
        const initialOrg = await page.evaluate(() => localStorage.getItem('org'));
        expect(initialOrg).not.toBeNull();

        // Mock CF Access
        await mockCloudflareAccessLogout(page);

        // Perform actual logout via UI
        await clickLogout(page);
        await page.waitForURL('**/cdn-cgi/access/login');

        // Verify auth keys were cleared by the app but preferences remain
        const org = await page.evaluate(() => localStorage.getItem('org'));
        const lastWorkspace = await page.evaluate(() => localStorage.getItem('lastWorkspace'));
        const preferences = await page.evaluate(() => localStorage.getItem('userPreferences'));

        expect(org).toBeNull();
        expect(lastWorkspace).toBeNull();
        expect(preferences).toBe('{"theme":"dark"}');
    });

    test('browser back button after logout does not restore session', async ({ orgAdminPage: page }) => {
        await page.goto('/');
        await expect(page.getByTestId(NAVBAR.PROFILE_BUTTON)).toBeVisible();

        await mockCloudflareAccessLogout(page);
        await clickLogout(page);

        // Wait for navigation to the CF Access login page
        await page.waitForURL('**/cdn-cgi/access/login');

        // Simulate cleared CF_Authorization cookie: the identity endpoint should
        // now fail, preventing the app from re-populating localStorage on reload.
        await page.route('**/cdn-cgi/access/get-identity', async (route) => {
            await route.fulfill({ status: 401, body: 'Unauthorized' });
        });

        // Go back to the app (simulating user pressing browser back button)
        await page.goBack();

        // localStorage should still be cleared - our app's logout cleanup persists
        const org = await page.evaluate(() => localStorage.getItem('org'));
        expect(org).toBeNull();
    });

    test('logout clears sessionStorage', async ({ orgAdminPage: page }) => {
        // Set session storage before logout
        await page.evaluate(() => {
            sessionStorage.setItem('tempAuthState', 'state-123');
            sessionStorage.setItem('pendingAction', 'some-action');
        });

        // Verify sessionStorage is set
        const initialState = await page.evaluate(() => sessionStorage.getItem('tempAuthState'));
        expect(initialState).toBe('state-123');

        await mockCloudflareAccessLogout(page);
        await clickLogout(page);
        await page.waitForURL('**/cdn-cgi/access/login');

        // Verify the APP cleared sessionStorage
        const clearedState = await page.evaluate(() => sessionStorage.getItem('tempAuthState'));
        expect(clearedState).toBeNull();
    });
});

test.describe('Multi-Account Switching', () => {
    test('logout clears org so next login starts fresh', async ({ orgAdminPage: page }) => {
        // Verify initial org is displayed
        await expect(page.getByTestId(NAVBAR.USER_ORG_NAME)).toHaveText('test-org-alpha');

        // Verify localStorage has the org
        const initialOrg = await page.evaluate(() => localStorage.getItem('org'));
        expect(initialOrg).toBe('test-org-alpha');

        // Perform actual logout
        await mockCloudflareAccessLogout(page);
        await clickLogout(page);
        await page.waitForURL('**/cdn-cgi/access/login');

        // Verify org was cleared - next login will fetch fresh from server
        const clearedOrg = await page.evaluate(() => localStorage.getItem('org'));
        expect(clearedOrg).toBeNull();
    });
});

test.describe('Cross-Browser Logout', () => {
    test('logout clears localStorage across browsers', async ({ orgAdminPage: page }) => {
        // Verify org is set before logout
        const initialOrg = await page.evaluate(() => localStorage.getItem('org'));
        expect(initialOrg).not.toBeNull();

        // Perform actual logout
        await mockCloudflareAccessLogout(page);
        await clickLogout(page);
        await page.waitForURL('**/cdn-cgi/access/login');

        // Verify localStorage was cleared by the app
        const clearedOrg = await page.evaluate(() => localStorage.getItem('org'));
        expect(clearedOrg).toBeNull();
    });
});

test.describe('Token Security', () => {
    test('API response does not contain token', async ({ orgAdminPage: page }) => {
        // Intercept the user sync API call and verify response shape

        let apiResponse: Record<string, unknown> | null = null;

        await page.route('**/api/v1/user/sync', async (route) => {
            const response = await route.fetch();
            apiResponse = await response.json();
            await route.fulfill({ response });
        });

        // Trigger a page reload to capture the API call
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify the response does not contain token
        expect(apiResponse).not.toBeNull();
        if (apiResponse) {
            expect(apiResponse).not.toHaveProperty('token');
            expect(apiResponse).not.toHaveProperty('cfToken');
            expect(apiResponse).not.toHaveProperty('CF_Authorization');
        }
    });
});

test.describe('Concurrent Tabs', () => {
    test('logout in one tab clears localStorage for all tabs', async ({ orgAdminPage: page }) => {
        // Open a second tab in the same context (shares localStorage)
        const page2 = await page.context().newPage();
        await page2.goto('/');

        // Verify both tabs see the org
        const tab1Org = await page.evaluate(() => localStorage.getItem('org'));
        const tab2Org = await page2.evaluate(() => localStorage.getItem('org'));
        expect(tab1Org).not.toBeNull();
        expect(tab2Org).not.toBeNull();

        // Logout from tab 1 (actual logout via UI)
        await mockCloudflareAccessLogout(page);
        await clickLogout(page);
        await page.waitForURL('**/cdn-cgi/access/login');

        // Tab 2 should see localStorage cleared (localStorage is shared within context)
        const tab2OrgAfterLogout = await page2.evaluate(() => localStorage.getItem('org'));
        expect(tab2OrgAfterLogout).toBeNull();

        await page2.close();
    });
});
