import { test, expect } from '@playwright/test';

/**
 * Smoke Test
 *
 * Simple test to verify Playwright config is working correctly.
 */

test.describe('Smoke Test', () => {
    test('page loads successfully', async ({ page }) => {
        await page.goto('/');

        // Verify page loaded (check for any content)
        await expect(page).toHaveTitle(/.*/);
    });

    test('can navigate to page', async ({ page }) => {
        const response = await page.goto('/');

        // Any response means the server is running
        expect(response).not.toBeNull();
        expect(response?.status()).toBeLessThan(500);
    });
});
