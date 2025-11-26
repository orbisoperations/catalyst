import { test, expect } from '../fixtures/auth';
import { verifyTopBarOrganization } from '../utils/test-helpers';
import { NAVBAR } from '../TEST_ID_CONSTANTS';

/**
 * Authentication & Authorization Tests
 *
 * CRITICAL: Minimal test to demonstrate the 18-month bug where
 * data-custodian-only users had user.custom.org = undefined
 *
 * Additional test scenarios saved in auth.spec.full.ts
 */

test.describe('TC-AUTH-003: Data Custodian Only User Login ⚠️ CRITICAL', () => {
    test('should extract organization correctly for data-custodian-only user', async ({ dataCustodianPage: page }) => {
        // CRITICAL: This is the exact scenario that caused the 18-month bug
        // User with ONLY data-custodian role (no org-admin, no org-user)

        await page.goto('/');

        // CRITICAL: TopBar must show actual org, NOT "undefined"
        await verifyTopBarOrganization(page, 'test-org-alpha');

        // Verify user email is displayed
        const userEmail = page.getByTestId(NAVBAR.USER_EMAIL);
        await expect(userEmail).toBeVisible();
        await expect(userEmail).toHaveText('test-data-custodian');
    });
});
