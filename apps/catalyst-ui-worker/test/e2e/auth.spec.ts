import { test, expect } from './fixtures/auth';
import { verifyTopBarOrganization } from './utils/test-helpers';
import { NAVBAR } from './utils/test-id-constants';

/**
 * Authentication & Authorization Tests
 *
 */

test.describe('TC-AUTH-003: Data Custodian Only User Login', () => {
    test('should extract organization correctly for data-custodian-only user', async ({ dataCustodianPage: page }) => {
        // User with ONLY data-custodian role (no org-admin, no org-user)

        await page.goto('/');

        // CRITICAL: TopBar must show actual org, NOT "undefined"
        await verifyTopBarOrganization(page, 'test-org-alpha');

        // Verify user email is displayed
        const userEmail = page.getByTestId(NAVBAR.USER_EMAIL_DISPLAY);
        await expect(userEmail).toBeVisible();
        await expect(userEmail).toHaveText('test-data-custodian');
    });
});
