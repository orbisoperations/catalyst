import { test, expect } from './fixtures/auth';
import { NAVBAR, TOKENS } from './utils/test-id-constants';

/**
 * Platform Admin Key Rotation Tests
 *
 * Verify that only platform admins can see and use the JWT key rotation feature.
 * This is a security-critical test to ensure non-admin users cannot rotate keys.
 */

test.describe('Platform Admin Key Rotation', () => {
    test('platform admin can see the admin panel and rotate button', async ({ platformAdminPage: page }) => {
        // Navigate to tokens page
        await page.goto('/');
        await page.getByTestId(NAVBAR.API_KEYS_LINK).click();
        await page.waitForURL('/tokens');

        // Verify admin panel is visible for platform admin
        const adminPanel = page.getByTestId(TOKENS.ADMIN_PANEL);
        await expect(adminPanel).toBeVisible();

        // Verify rotate button is visible and clickable
        const rotateButton = page.getByTestId(TOKENS.ADMIN_ROTATE_BUTTON);
        await expect(rotateButton).toBeVisible();
        await expect(rotateButton).toBeEnabled();
    });

    test('org-admin cannot see the admin panel or rotate button', async ({ orgAdminPage: page }) => {
        // Navigate to tokens page
        await page.goto('/');
        await page.getByTestId(NAVBAR.API_KEYS_LINK).click();
        await page.waitForURL('/tokens');

        // Wait for the page to fully load (wait for loading spinner to disappear or content to appear)
        await page.waitForLoadState('networkidle');

        // Verify admin panel is NOT visible for org-admin
        const adminPanel = page.getByTestId(TOKENS.ADMIN_PANEL);
        await expect(adminPanel).not.toBeVisible();

        // Verify rotate button is NOT visible
        const rotateButton = page.getByTestId(TOKENS.ADMIN_ROTATE_BUTTON);
        await expect(rotateButton).not.toBeVisible();
    });

    test('data-custodian cannot see the admin panel or rotate button', async ({ dataCustodianPage: page }) => {
        // Navigate to tokens page
        await page.goto('/');
        await page.getByTestId(NAVBAR.API_KEYS_LINK).click();
        await page.waitForURL('/tokens');

        // Wait for the page to fully load
        await page.waitForLoadState('networkidle');

        // Verify admin panel is NOT visible for data-custodian
        const adminPanel = page.getByTestId(TOKENS.ADMIN_PANEL);
        await expect(adminPanel).not.toBeVisible();

        // Verify rotate button is NOT visible
        const rotateButton = page.getByTestId(TOKENS.ADMIN_ROTATE_BUTTON);
        await expect(rotateButton).not.toBeVisible();
    });

    test('org-user cannot see the admin panel or rotate button', async ({ orgUserPage: page }) => {
        // Navigate to tokens page
        await page.goto('/');
        await page.getByTestId(NAVBAR.API_KEYS_LINK).click();
        await page.waitForURL('/tokens');

        // Wait for the page to fully load
        await page.waitForLoadState('networkidle');

        // Verify admin panel is NOT visible for org-user
        const adminPanel = page.getByTestId(TOKENS.ADMIN_PANEL);
        await expect(adminPanel).not.toBeVisible();

        // Verify rotate button is NOT visible
        const rotateButton = page.getByTestId(TOKENS.ADMIN_ROTATE_BUTTON);
        await expect(rotateButton).not.toBeVisible();
    });
});
