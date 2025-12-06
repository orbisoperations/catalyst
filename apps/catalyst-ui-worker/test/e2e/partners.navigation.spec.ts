import { test, expect } from './fixtures/auth';
import { NAVBAR, PARTNERS } from './utils/test-id-constants';

/**
 * Partners Navigation & Cross-Role View Tests
 *
 * Verifies that all user roles can navigate to and view the partners page,
 * and that the page handles empty/populated states correctly.
 */

test.describe('Partners Navigation', () => {
    test('Platform Admin can access partners via navbar', async ({ platformAdminPage: page }) => {
        await page.goto('/');
        await page.getByTestId(NAVBAR.PARTNERS_LINK).click();
        await page.waitForURL('/partners');

        // Verify page loaded successfully
        await expect(page.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();
        await expect(page.getByTestId(PARTNERS.INVITATIONS_CARD)).toBeVisible();
    });

    test('Org Admin can access partners via navbar', async ({ orgAdminPage: page }) => {
        await page.goto('/');
        await page.getByTestId(NAVBAR.PARTNERS_LINK).click();
        await page.waitForURL('/partners');

        // Verify page loaded successfully
        await expect(page.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();
        await expect(page.getByTestId(PARTNERS.INVITATIONS_CARD)).toBeVisible();
    });

    test('Data Custodian can access partners via navbar', async ({ dataCustodianPage: page }) => {
        await page.goto('/');
        await page.getByTestId(NAVBAR.PARTNERS_LINK).click();
        await page.waitForURL('/partners');

        // Verify page loaded successfully
        await expect(page.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();
        await expect(page.getByTestId(PARTNERS.INVITATIONS_CARD)).toBeVisible();
    });

    test('Org User can access partners via navbar', async ({ orgUserPage: page }) => {
        await page.goto('/');
        await page.getByTestId(NAVBAR.PARTNERS_LINK).click();
        await page.waitForURL('/partners');

        // Verify page loaded successfully
        await expect(page.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();
        await expect(page.getByTestId(PARTNERS.INVITATIONS_CARD)).toBeVisible();
    });

    test('Partners page shows empty state correctly', async ({ orgAdminPage: page }) => {
        await page.goto('/');
        await page.getByTestId(NAVBAR.PARTNERS_LINK).click();
        await page.waitForURL('/partners');

        const partnersCard = page.getByTestId(PARTNERS.LIST_CARD);
        await expect(partnersCard).toBeVisible();

        // Check for either partners or "No Partners" message
        const hasPartners = await partnersCard.locator('[data-testid^="partners-row-"]').count();
        if (hasPartners === 0) {
            await expect(partnersCard).toContainText('No Partners');
        }

        const invitationsCard = page.getByTestId(PARTNERS.INVITATIONS_CARD);
        await expect(invitationsCard).toBeVisible();

        // Check for either invitations or "No Invitations" message
        const hasInvitations = await invitationsCard.locator('button').count();
        if (hasInvitations === 0) {
            await expect(invitationsCard).toContainText('No Invitations');
        }
    });

    test('Partners navbar link is visible for all roles', async ({ authenticatedPage }) => {
        const roles = ['platform-admin', 'org-admin', 'data-custodian', 'org-user'] as const;

        for (const role of roles) {
            const page = await authenticatedPage(role);
            await page.goto('/');

            // Partners link should be visible in navbar
            const partnersLink = page.getByTestId(NAVBAR.PARTNERS_LINK);
            await expect(partnersLink).toBeVisible();
        }
    });
});
