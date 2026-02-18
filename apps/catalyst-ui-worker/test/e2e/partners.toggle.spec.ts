import { test, expect } from './fixtures/auth';
import type { Page } from '@playwright/test';
import { PARTNERS } from './utils/test-id-constants';
import { cleanupPartnershipState, createAndAcceptPartnership } from './utils/partners-utils';

/**
 * Partnership Toggle E2E Tests
 *
 * Validates the  partnership toggle flow through the UI:
 * - Bidirectional toggle consistency (both orgs see the same state)
 * - Controlled Switch (isChecked reflects server state, not local state)
 * - Tug-of-war prevention (non-disabling org cannot re-enable)
 * - Review fix 4: isDisabled during in-flight toggle request
 *
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get the toggle Switch for a partner row by org name.
 * Partner IDs are dynamic, so we locate the row by text content.
 */
function getPartnerToggle(page: Page, partnerOrgName: string) {
    // Use .last() to select the most recently created partnership entry.
    // The DO may retain stale cross-org entries that survive cleanup due to
    // eventual consistency; .last() ensures we operate on the current entry.
    const partnerRow = page
        .getByTestId(PARTNERS.LIST_CARD)
        .locator('[data-testid^="partners-row-"]')
        .filter({ hasText: partnerOrgName })
        .last();
    return partnerRow.locator('[data-testid*="-toggle"]');
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Partnership Toggle Bug Fixes', () => {
    test.describe.configure({ mode: 'serial' });

    // eslint-disable-next-line no-empty-pattern
    test.beforeEach(async ({}, testInfo) => {
        test.skip(
            !testInfo.project.name.startsWith('chromium'),
            'Partnership toggle tests only run on chromium projects'
        );
    });

    test('Bidirectional toggle consistency and tug-of-war prevention', async ({
        orgAdminPage: alphaPage,
        orgAdminBetaPage: betaPage,
    }) => {
        await test.step('Setup: Clean any existing partnership state', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
        });

        await test.step('Step 1: Create and accept partnership', async () => {
            await createAndAcceptPartnership(alphaPage, betaPage);
        });

        // Partnerships start with isActive: false after acceptance
        await test.step('Step 2: Alpha activates partnership (toggle ON)', async () => {
            await alphaPage.goto('/partners');
            const toggle = getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).toBeVisible();
            await expect(toggle).not.toBeChecked();

            await toggle.click();
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 3: Beta sees partnership as ON', async () => {
            await betaPage.goto('/partners');
            const toggle = getPartnerToggle(betaPage, 'test-org-alpha');

            await expect(toggle).toBeVisible();
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 4: Alpha toggles partnership OFF', async () => {
            await alphaPage.goto('/partners');
            const toggle = getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).toBeChecked();
            await toggle.click();
            await expect(toggle).not.toBeChecked();
        });

        await test.step('Step 5: Beta sees partnership as OFF', async () => {
            await betaPage.goto('/partners');
            const toggle = getPartnerToggle(betaPage, 'test-org-alpha');

            await expect(toggle).toBeVisible();
            await expect(toggle).not.toBeChecked();
        });

        await test.step('Step 6: Beta cannot re-enable (tug-of-war prevention)', async () => {
            const toggle = getPartnerToggle(betaPage, 'test-org-alpha');
            await toggle.click();

            // Server rejects with InvalidOperationError → ErrorCard replaces the table
            const errorCard = betaPage.getByText('An error occurred while toggling the partner');
            await expect(errorCard).toBeVisible({ timeout: 10000 });

            // Click Retry to reload the partners list
            const retryButton = betaPage.getByRole('button', { name: 'Retry' });
            await expect(retryButton).toBeVisible();
            await retryButton.click();

            // After reload, toggle should still be unchecked
            const toggleAfterRetry = getPartnerToggle(betaPage, 'test-org-alpha');
            await expect(toggleAfterRetry).toBeVisible();
            await expect(toggleAfterRetry).not.toBeChecked();
        });

        await test.step('Step 7: Alpha re-enables the partnership', async () => {
            await alphaPage.goto('/partners');
            const toggle = getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).toBeVisible();
            await expect(toggle).not.toBeChecked();

            await toggle.click();
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 8: Beta sees partnership as ON', async () => {
            await betaPage.goto('/partners');
            const toggle = getPartnerToggle(betaPage, 'test-org-alpha');

            await expect(toggle).toBeVisible();
            await expect(toggle).toBeChecked();
        });

        await test.step('Cleanup: delete partnership from both sides', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
        });
    });

    test('Switch disabled during async toggle request', async ({
        orgAdminPage: alphaPage,
        orgAdminBetaPage: betaPage,
    }) => {
        await test.step('Setup: Create partnership', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
            await createAndAcceptPartnership(alphaPage, betaPage);
        });

        // Partnerships start with isActive: false after acceptance
        await test.step('Step 1: Verify initial toggle state', async () => {
            await alphaPage.goto('/partners');
            const toggle = getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).toBeVisible();
            await expect(toggle).not.toBeChecked();
            await expect(toggle).not.toBeDisabled();
        });

        await test.step('Step 2: Click toggle and verify disabled during request', async () => {
            // Intercept toggle API to add a delay, making the disabled state observable
            await alphaPage.route('**/api/v1/partners/*/toggle', async (route) => {
                await new Promise((r) => setTimeout(r, 500));
                await route.continue();
            });

            const toggle = getPartnerToggle(alphaPage, 'test-org-beta');
            await toggle.click();

            // Toggle should be disabled while the request is in-flight
            await expect(toggle).toBeDisabled();
        });

        await test.step('Step 3: Wait for toggle to complete', async () => {
            const toggle = getPartnerToggle(alphaPage, 'test-org-beta');

            // Wait for the toggle to become enabled again (request completed)
            await expect(toggle).not.toBeDisabled({ timeout: 10000 });
            // Controlled state should now reflect server value: checked (toggled ON)
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 4: Toggle back and verify same disabled pattern', async () => {
            const toggle = getPartnerToggle(alphaPage, 'test-org-beta');
            await toggle.click();

            // Should be disabled during the request again
            await expect(toggle).toBeDisabled();

            // Wait for completion
            await expect(toggle).not.toBeDisabled({ timeout: 10000 });
            await expect(toggle).not.toBeChecked();
        });

        await test.step('Cleanup: remove route interceptor and delete partnership', async () => {
            await alphaPage.unroute('**/api/v1/partners/*/toggle');
            await cleanupPartnershipState(alphaPage, betaPage);
        });
    });

    test('Toggle reflects controlled state after page reload', async ({
        orgAdminPage: alphaPage,
        orgAdminBetaPage: betaPage,
    }) => {
        await test.step('Setup: Create partnership', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
            await createAndAcceptPartnership(alphaPage, betaPage);
        });

        // Partnerships start with isActive: false after acceptance
        await test.step('Step 1: Alpha toggles partnership ON', async () => {
            await alphaPage.goto('/partners');
            const toggle = getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).not.toBeChecked();
            await toggle.click();
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 2: Navigate away and back — toggle should still be ON', async () => {
            await alphaPage.goto('/channels');
            await expect(alphaPage).toHaveURL('/channels');

            await alphaPage.goto('/partners');
            const toggle = getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).toBeVisible();
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 3: Alpha toggles partnership OFF', async () => {
            const toggle = getPartnerToggle(alphaPage, 'test-org-beta');
            await toggle.click();
            await expect(toggle).not.toBeChecked();
        });

        await test.step('Step 4: Navigate away and back — toggle should still be OFF', async () => {
            await alphaPage.goto('/channels');
            await expect(alphaPage).toHaveURL('/channels');

            await alphaPage.goto('/partners');
            const toggle = getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).toBeVisible();
            await expect(toggle).not.toBeChecked();
        });

        await test.step('Cleanup: delete partnership from both sides', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
        });
    });
});
