import { test, expect } from './fixtures/auth';
import type { Page } from '@playwright/test';
import { PARTNERS } from './utils/test-id-constants';
import { cleanupPartnershipState, createAndAcceptPartnership } from './utils/partners-utils';

/**
 * Partnership Toggle E2E Tests
 *
 * Validates the per-org partnership toggle flow through the UI:
 * - Independent per-org toggle (each org controls their own sharing flag)
 * - PartnerSharingStatus text reflects partner's sharing direction
 * - Both-orgs-sharing mutual state
 * - Receiver-side toggle perspective
 * - Controlled Switch (isChecked reflects server state, not local state)
 * - isDisabled during in-flight toggle request
 * - Toggle API failure shows error in UI
 *
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Locate the partner row for a given org name.
 * Asserts exactly 1 matching row exists — fails fast if cleanup missed stale entries.
 */
async function getPartnerRow(page: Page, partnerOrgName: string) {
    const rows = page
        .getByTestId(PARTNERS.LIST_CARD)
        .locator('[data-testid^="partners-row-"]')
        .filter({ hasText: partnerOrgName });

    await expect(rows).toHaveCount(1);
    return rows.first();
}

/**
 * Get the toggle Switch for a partner row by org name.
 * Partner IDs are dynamic, so we locate the row by text content.
 */
async function getPartnerToggle(page: Page, partnerOrgName: string) {
    const row = await getPartnerRow(page, partnerOrgName);
    return row.locator('[data-testid*="-toggle"]');
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

    test('Independent per-org toggle with sharing status', async ({
        orgAdminPage: alphaPage,
        orgAdminBetaPage: betaPage,
    }) => {
        await test.step('Setup: Clean any existing partnership state', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
        });

        await test.step('Step 1: Create and accept partnership', async () => {
            await createAndAcceptPartnership(alphaPage, betaPage);
        });

        // Both senderEnabled and receiverEnabled start false after acceptance
        await test.step('Step 2: Alpha toggles ON', async () => {
            await alphaPage.goto('/partners');
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).toBeVisible();
            await expect(toggle).not.toBeChecked();

            await toggle.click();
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 3: Beta toggle is still unchecked (independent)', async () => {
            await betaPage.goto('/partners');
            const toggle = await getPartnerToggle(betaPage, 'test-org-alpha');

            await expect(toggle).toBeVisible();
            await expect(toggle).not.toBeChecked();
        });

        // HIGH coverage gap: validate PartnerSharingStatus text
        await test.step('Step 3b: Beta sees that Alpha is sharing', async () => {
            const row = await getPartnerRow(betaPage, 'test-org-alpha');
            await expect(row).toContainText('test-org-alpha is sharing with you');
        });

        await test.step('Step 4: Beta toggles ON', async () => {
            const toggle = await getPartnerToggle(betaPage, 'test-org-alpha');
            await toggle.click();
            await expect(toggle).toBeChecked();
        });

        // HIGH coverage gap: both-orgs-sharing mutual state
        await test.step('Step 4b: Alpha sees both sharing (mutual state)', async () => {
            await alphaPage.goto('/partners');
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');
            await expect(toggle).toBeChecked();

            const row = await getPartnerRow(alphaPage, 'test-org-beta');
            await expect(row).toContainText('test-org-beta is sharing with you');
        });

        await test.step('Step 5: Alpha toggle still checked (independent)', async () => {
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).toBeVisible();
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 6: Alpha toggles OFF', async () => {
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');
            await toggle.click();
            await expect(toggle).not.toBeChecked();
        });

        // HIGH coverage gap: status text shows "not sharing" after toggle off
        await test.step('Step 6b: Alpha sees Beta is still sharing', async () => {
            const row = await getPartnerRow(alphaPage, 'test-org-beta');
            await expect(row).toContainText('test-org-beta is sharing with you');
        });

        await test.step('Step 7: Beta toggle still checked (independent)', async () => {
            await betaPage.goto('/partners');
            const toggle = await getPartnerToggle(betaPage, 'test-org-alpha');

            await expect(toggle).toBeVisible();
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 7b: Beta sees Alpha is no longer sharing', async () => {
            const row = await getPartnerRow(betaPage, 'test-org-alpha');
            await expect(row).toContainText('test-org-alpha is not sharing with you');
        });

        await test.step('Cleanup: delete partnership from both sides', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
        });
    });

    // MEDIUM coverage gap: receiver-side toggle perspective
    test('Receiver-side toggle perspective', async ({ orgAdminPage: alphaPage, orgAdminBetaPage: betaPage }) => {
        await test.step('Setup: Create partnership', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
            await createAndAcceptPartnership(alphaPage, betaPage);
        });

        await test.step('Step 1: Beta (receiver) toggles ON', async () => {
            await betaPage.goto('/partners');
            const toggle = await getPartnerToggle(betaPage, 'test-org-alpha');

            await expect(toggle).not.toBeChecked();
            await toggle.click();
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 2: Alpha sees Beta is sharing', async () => {
            await alphaPage.goto('/partners');
            const row = await getPartnerRow(alphaPage, 'test-org-beta');
            await expect(row).toContainText('test-org-beta is sharing with you');

            // Alpha's own toggle should still be off
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');
            await expect(toggle).not.toBeChecked();
        });

        await test.step('Step 3: Beta (receiver) toggles OFF', async () => {
            await betaPage.goto('/partners');
            const toggle = await getPartnerToggle(betaPage, 'test-org-alpha');

            await expect(toggle).toBeChecked();
            await toggle.click();
            await expect(toggle).not.toBeChecked();
        });

        await test.step('Step 4: Alpha sees Beta is no longer sharing', async () => {
            await alphaPage.goto('/partners');
            const row = await getPartnerRow(alphaPage, 'test-org-beta');
            await expect(row).toContainText('test-org-beta is not sharing with you');
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

        // Both senderEnabled and receiverEnabled start false after acceptance
        await test.step('Step 1: Verify initial toggle state', async () => {
            await alphaPage.goto('/partners');
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');

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

            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');
            await toggle.click();

            // Toggle should be disabled while the request is in-flight
            await expect(toggle).toBeDisabled();
        });

        await test.step('Step 3: Wait for toggle to complete', async () => {
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');

            // Wait for the toggle to become enabled again (request completed)
            await expect(toggle).not.toBeDisabled({ timeout: 10000 });
            // Controlled state should now reflect server value: checked (toggled ON)
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 4: Toggle back and verify same disabled pattern', async () => {
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');
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

        // Both senderEnabled and receiverEnabled start false after acceptance
        await test.step('Step 1: Alpha toggles partnership ON', async () => {
            await alphaPage.goto('/partners');
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).not.toBeChecked();
            await toggle.click();
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 2: Navigate away and back — toggle should still be ON', async () => {
            await alphaPage.goto('/channels');
            await expect(alphaPage).toHaveURL('/channels');

            await alphaPage.goto('/partners');
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).toBeVisible();
            await expect(toggle).toBeChecked();
        });

        await test.step('Step 3: Alpha toggles partnership OFF', async () => {
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');
            await toggle.click();
            await expect(toggle).not.toBeChecked();
        });

        await test.step('Step 4: Navigate away and back — toggle should still be OFF', async () => {
            await alphaPage.goto('/channels');
            await expect(alphaPage).toHaveURL('/channels');

            await alphaPage.goto('/partners');
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');

            await expect(toggle).toBeVisible();
            await expect(toggle).not.toBeChecked();
        });

        await test.step('Cleanup: delete partnership from both sides', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
        });
    });

    // MEDIUM coverage gap: toggle API failure shows error UI
    test('Toggle API failure shows error in UI', async ({ orgAdminPage: alphaPage, orgAdminBetaPage: betaPage }) => {
        await test.step('Setup: Create partnership', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
            await createAndAcceptPartnership(alphaPage, betaPage);
        });

        await test.step('Step 1: Intercept toggle API to return error', async () => {
            await alphaPage.goto('/partners');
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');
            await expect(toggle).toBeVisible();

            // Force the server action to throw by intercepting the Next.js RSC call
            await alphaPage.route('**/partners', async (route) => {
                const request = route.request();
                // Only intercept the server action POST (Next.js RSC), not navigation GETs
                if (request.method() === 'POST') {
                    await route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: JSON.stringify({ error: 'Internal Server Error' }),
                    });
                } else {
                    await route.continue();
                }
            });
        });

        await test.step('Step 2: Click toggle and verify error is displayed', async () => {
            const toggle = await getPartnerToggle(alphaPage, 'test-org-beta');
            await toggle.click();

            // The component catches errors and shows an ErrorCard with this message
            await expect(
                alphaPage.getByText('An error occurred while toggling the partner. Please try again later.')
            ).toBeVisible({ timeout: 10000 });
        });

        await test.step('Cleanup: remove route interceptor and delete partnership', async () => {
            await alphaPage.unroute('**/partners');
            await cleanupPartnershipState(alphaPage, betaPage);
        });
    });
});
