import { test, expect } from './fixtures/auth';
import { PARTNERS, INVITE } from './utils/test-id-constants';
import { cleanupPartnershipState } from './utils/partners-utils';

/**
 * Partnership Workflow E2E Tests
 *
 * These tests verify the complete partnership lifecycle between two organizations:
 * - test-org-alpha (orgAdminPage)
 * - test-org-beta (orgAdminBetaPage)
 *
 * Each workflow is a SINGLE test with multiple steps. This design:
 * 1. Makes state dependencies explicit (steps within one test)
 * 2. Provides step-level reporting via test.step()
 * 3. Allows debugging any step by running the single test
 * 4. Avoids flaky .first() selectors by tracking created resources
 *
 * CLEANUP: Each test cleans up after itself AND runs cleanup before starting
 * to handle cases where a previous run failed mid-way.
 */

test.describe('Partnership Lifecycle', () => {
    // CRITICAL: These tests MUST run serially because they share test-org-alpha/test-org-beta state.
    // Parallel execution across browser projects causes race conditions.
    // Only run on desktop chromium project to avoid cross-project state conflicts.
    test.describe.configure({ mode: 'serial' });

    // eslint-disable-next-line no-empty-pattern
    test.beforeEach(async ({}, testInfo) => {
        // Skip for non-chromium projects (mobile-chrome, tablet, etc.)
        test.skip(
            !testInfo.project.name.startsWith('chromium'),
            'Partnership workflow tests only run on chromium projects'
        );
    });

    test('Full partnership lifecycle: create → accept → toggle → delete', async ({
        orgAdminPage: alphaPage,
        orgAdminBetaPage: betaPage,
    }) => {
        // Ensure clean state before starting
        await test.step('Setup: Clean any existing partnership state', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
        });

        await test.step('Step 1: Admin (Alpha) creates partnership invite to Beta', async () => {
            await alphaPage.goto('/partners');
            await expect(alphaPage.getByTestId(PARTNERS.CREATE_BUTTON)).toBeVisible();
            await alphaPage.getByTestId(PARTNERS.CREATE_BUTTON).click();

            await alphaPage.waitForURL('/partners/invite');

            await alphaPage.getByTestId(INVITE.ORG_ID_INPUT).fill('test-org-beta');
            await alphaPage.getByTestId(INVITE.MESSAGE_INPUT).fill('E2E workflow test invite');
            await alphaPage.getByTestId(INVITE.SEND_BUTTON).click();

            await alphaPage.waitForURL('/partners');
            await expect(alphaPage.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();
        });

        await test.step('Step 2: Admin (Beta) sees and accepts the invite', async () => {
            await betaPage.goto('/partners');

            const invitationsCard = betaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
            await expect(invitationsCard).toBeVisible();

            const alphaInvite = invitationsCard.getByText('test-org-alpha');
            await expect(alphaInvite).toBeVisible();
            await alphaInvite.click();

            await expect(betaPage).toHaveURL(/\/partners\/invite\/accept\/(.+)/);

            await expect(betaPage.getByTestId(INVITE.ACCEPT_BUTTON)).toBeVisible();
            await betaPage.getByTestId(INVITE.ACCEPT_BUTTON).click();

            await betaPage.waitForURL('/partners');

            const partnersCard = betaPage.getByTestId(PARTNERS.LIST_CARD);
            await expect(partnersCard).toContainText('test-org-alpha');
        });

        await test.step('Step 3: Both orgs see each other as partners', async () => {
            await alphaPage.goto('/partners');
            await expect(alphaPage.getByTestId(PARTNERS.LIST_CARD)).toContainText('test-org-beta');

            await betaPage.goto('/partners');
            await expect(betaPage.getByTestId(PARTNERS.LIST_CARD)).toContainText('test-org-alpha');
        });

        await test.step('Step 4: Admin (Alpha) toggles partnership status', async () => {
            await alphaPage.goto('/partners');

            const partnersCard = alphaPage.getByTestId(PARTNERS.LIST_CARD);
            // Use .last() to select the most recently created partnership entry.
            // The DO may retain stale entries from interrupted previous test runs;
            // .last() ensures we operate on the current entry.
            const partnerRow = partnersCard
                .locator('[data-testid^="partners-row-"]')
                .filter({ hasText: 'test-org-beta' })
                .last();
            const toggle = partnerRow.locator('[data-testid*="-toggle"]');

            await expect(toggle).toBeVisible();

            const initialChecked = await toggle.isChecked();
            await toggle.click();

            await expect(toggle).toBeChecked({ checked: !initialChecked });

            await toggle.click();
            await expect(toggle).toBeChecked({ checked: initialChecked });
        });

        await test.step('Step 5: Admin (Alpha) deletes partnership', async () => {
            await alphaPage.goto('/partners');

            const partnersCard = alphaPage.getByTestId(PARTNERS.LIST_CARD);
            const partnerRow = partnersCard
                .locator('[data-testid^="partners-row-"]')
                .filter({ hasText: 'test-org-beta' })
                .last();
            const deleteButton = partnerRow.locator('[data-testid*="-delete"]');

            await expect(deleteButton).toBeVisible();
            await deleteButton.click();

            const confirmButton = alphaPage.getByRole('button', { name: /cancel partnership/i });
            await expect(confirmButton).toBeVisible();
            await confirmButton.click();

            await expect(partnersCard).not.toContainText('test-org-beta');
        });

        await test.step('Step 6: Verify cleanup - Beta no longer sees Alpha as partner', async () => {
            await betaPage.goto('/partners');
            const betaPartnersCard = betaPage.getByTestId(PARTNERS.LIST_CARD);
            await expect(betaPartnersCard).not.toContainText('test-org-alpha');
        });
    });

    test('Decline invite workflow: create → decline → verify removed', async ({
        orgAdminPage: alphaPage,
        orgAdminBetaPage: betaPage,
    }) => {
        // Ensure clean state before starting
        await test.step('Setup: Clean any existing partnership state', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
        });

        await test.step('Step 1: Admin (Alpha) creates invite', async () => {
            await alphaPage.goto('/partners');
            await alphaPage.getByTestId(PARTNERS.CREATE_BUTTON).click();
            await alphaPage.waitForURL('/partners/invite');

            await alphaPage.getByTestId(INVITE.ORG_ID_INPUT).fill('test-org-beta');
            await alphaPage.getByTestId(INVITE.MESSAGE_INPUT).fill('E2E decline test invite');
            await alphaPage.getByTestId(INVITE.SEND_BUTTON).click();

            await alphaPage.waitForURL('/partners');
        });

        await test.step('Step 2: Admin (Beta) declines the invite', async () => {
            await betaPage.goto('/partners');

            const invitationsCard = betaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
            const alphaInvite = invitationsCard.getByText('test-org-alpha');
            await expect(alphaInvite).toBeVisible();
            await alphaInvite.click();

            await expect(betaPage).toHaveURL(/\/partners\/invite\/accept\/.+/);

            await betaPage.getByTestId(INVITE.REJECT_BUTTON).click();

            await expect(betaPage.getByTestId(INVITE.CONFIRM_REJECT_BUTTON)).toBeVisible();
            await betaPage.getByTestId(INVITE.CONFIRM_REJECT_BUTTON).click();

            await betaPage.waitForURL('/partners');
        });

        await test.step('Step 3: Verify invite removed from both sides', async () => {
            // Beta should not see invite
            const betaInvitations = betaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
            await expect(betaInvitations).not.toContainText('test-org-alpha');

            // Alpha should not see pending invite either (it was declined)
            await alphaPage.goto('/partners');
            const alphaInvitations = alphaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
            await expect(alphaInvitations).not.toContainText('test-org-beta');
        });
    });

    test('Duplicate invite prevention: shows error when invite already exists', async ({
        orgAdminPage: alphaPage,
        orgAdminBetaPage: betaPage,
    }) => {
        // Ensure clean state before starting
        await test.step('Setup: Clean any existing partnership state', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
        });

        await test.step('Step 1: Admin (Alpha) creates first invite to Beta', async () => {
            await alphaPage.goto('/partners');
            await alphaPage.getByTestId(PARTNERS.CREATE_BUTTON).click();
            await alphaPage.waitForURL('/partners/invite');

            await alphaPage.getByTestId(INVITE.ORG_ID_INPUT).fill('test-org-beta');
            await alphaPage.getByTestId(INVITE.MESSAGE_INPUT).fill('First invite');
            await alphaPage.getByTestId(INVITE.SEND_BUTTON).click();

            // Should succeed and redirect to partners
            await alphaPage.waitForURL('/partners');
            await expect(alphaPage.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();

            // Verify the invite was actually created by checking Beta's invitations
            await betaPage.goto('/partners');
            const invitationsCard = betaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
            await expect(invitationsCard).toBeVisible({ timeout: 10000 });
            await expect(invitationsCard.getByText('test-org-alpha')).toBeVisible({ timeout: 5000 });
        });

        await test.step('Step 2: Admin (Alpha) tries to send second invite - should fail', async () => {
            await alphaPage.goto('/partners');
            await alphaPage.getByTestId(PARTNERS.CREATE_BUTTON).click();
            await alphaPage.waitForURL('/partners/invite');

            await alphaPage.getByTestId(INVITE.ORG_ID_INPUT).fill('test-org-beta');
            await alphaPage.getByTestId(INVITE.MESSAGE_INPUT).fill('Second invite - should fail');
            await alphaPage.getByTestId(INVITE.SEND_BUTTON).click();

            // Wait for form submission to complete (either error or redirect)
            // Watch for either error message OR redirect - whichever happens first
            const errorMessage = alphaPage.getByTestId(INVITE.ERROR_MESSAGE);
            const errorCard = alphaPage.locator('[data-testid="error-card"]');

            try {
                // Wait for error message, error card, or URL change (up to 15 seconds)
                await Promise.race([
                    errorMessage.waitFor({ state: 'visible', timeout: 15000 }),
                    errorCard.waitFor({ state: 'visible', timeout: 15000 }),
                    alphaPage.waitForURL('/partners', { timeout: 15000 }),
                ]);
            } catch {
                // Race timed out - take a snapshot for debugging
                const pageContent = await alphaPage.content();
                console.log('Page URL:', alphaPage.url());
                console.log('Page contains error-message:', pageContent.includes('invite-error-message'));
            }

            // Check final state
            const currentUrl = alphaPage.url();
            if (currentUrl.includes('/partners/invite')) {
                // Check if inline error message is visible
                if (await errorMessage.isVisible()) {
                    // Same-direction duplicate: "You already have a pending invite to this organization"
                    await expect(errorMessage).toContainText('already have a pending invite to');
                } else if (await errorCard.isVisible()) {
                    throw new Error(
                        'Generic error card shown instead of inline error. Error might not contain "pending invite".'
                    );
                } else {
                    // Neither error is visible - check what's on the page
                    const sendButton = alphaPage.getByTestId('invite-send-button');
                    const isLoading = await sendButton.getAttribute('data-loading');
                    throw new Error(
                        `No error message visible. Send button loading: ${isLoading}. Page stayed on invite but no error shown.`
                    );
                }
            } else {
                throw new Error(
                    `Redirected to ${currentUrl}. Second invite may have succeeded (duplicate check not working).`
                );
            }
        });

        await test.step('Step 3: Cleanup - Beta declines the pending invite', async () => {
            await betaPage.goto('/partners');
            const invitationsCard = betaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
            const alphaInvite = invitationsCard.getByText('test-org-alpha');
            await expect(alphaInvite).toBeVisible();
            await alphaInvite.click();

            await betaPage.getByTestId(INVITE.REJECT_BUTTON).click();
            await betaPage.getByTestId(INVITE.CONFIRM_REJECT_BUTTON).click();
            await betaPage.waitForURL('/partners');
        });
    });

    test('Bidirectional block: cannot invite org that already has pending invite to you', async ({
        orgAdminPage: alphaPage,
        orgAdminBetaPage: betaPage,
    }) => {
        // Ensure clean state before starting
        await test.step('Setup: Clean any existing partnership state', async () => {
            await cleanupPartnershipState(alphaPage, betaPage);
        });

        await test.step('Step 1: Admin (Alpha) creates invite to Beta', async () => {
            await alphaPage.goto('/partners');
            await alphaPage.getByTestId(PARTNERS.CREATE_BUTTON).click();
            await alphaPage.waitForURL('/partners/invite');

            await alphaPage.getByTestId(INVITE.ORG_ID_INPUT).fill('test-org-beta');
            await alphaPage.getByTestId(INVITE.MESSAGE_INPUT).fill('Invite from Alpha');
            await alphaPage.getByTestId(INVITE.SEND_BUTTON).click();

            await alphaPage.waitForURL('/partners');
        });

        await test.step('Step 2: Admin (Beta) tries to invite Alpha - should fail (bidirectional block)', async () => {
            await betaPage.goto('/partners');
            await betaPage.getByTestId(PARTNERS.CREATE_BUTTON).click();
            await betaPage.waitForURL('/partners/invite');

            await betaPage.getByTestId(INVITE.ORG_ID_INPUT).fill('test-org-alpha');
            await betaPage.getByTestId(INVITE.MESSAGE_INPUT).fill('Reverse invite - should fail');
            await betaPage.getByTestId(INVITE.SEND_BUTTON).click();

            // Should stay on invite page and show error (wait for async form submission)
            await betaPage.waitForTimeout(1000);

            // Should still be on invite page (not redirected)
            await expect(betaPage).toHaveURL('/partners/invite');

            // Error message should be visible with extended timeout for async response
            // Bidirectional block: "This organization already has a pending invite to you"
            // (different from same-direction duplicate which says "You already have a pending invite to")
            const errorMessage = betaPage.getByTestId(INVITE.ERROR_MESSAGE);
            await expect(errorMessage).toBeVisible({ timeout: 10000 });
            await expect(errorMessage).toContainText('already has a pending invite to you');
        });

        await test.step('Step 3: Cleanup - Beta declines the pending invite from Alpha', async () => {
            await betaPage.goto('/partners');
            const invitationsCard = betaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
            const alphaInvite = invitationsCard.getByText('test-org-alpha');
            await expect(alphaInvite).toBeVisible();
            await alphaInvite.click();

            await betaPage.getByTestId(INVITE.REJECT_BUTTON).click();
            await betaPage.getByTestId(INVITE.CONFIRM_REJECT_BUTTON).click();
            await betaPage.waitForURL('/partners');
        });
    });
});
