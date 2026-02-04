import { expect, type Page } from '@playwright/test';
import { PARTNERS, INVITE } from './test-id-constants';

/**
 * Clean up any existing partnerships or pending invites between alpha and beta.
 *
 * Key insight: Invitations card shows INBOUND invites (from other orgs).
 * - Alpha's invitations show invites FROM others (not TO others)
 * - Beta's invitations show invites FROM Alpha
 * So we primarily clean up by having Beta decline invites from Alpha.
 */
export async function cleanupPartnershipState(alphaPage: Page, betaPage: Page): Promise<void> {
    // Step 1: Delete all existing partnerships from Alpha's side (handle duplicates)
    await alphaPage.goto('/partners');
    await expect(alphaPage.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();

    let alphaPartnersCard = alphaPage.getByTestId(PARTNERS.LIST_CARD);
    let betaPartnerRow = alphaPartnersCard
        .locator('[data-testid^="partners-row-"]')
        .filter({ hasText: 'test-org-beta' });

    while ((await betaPartnerRow.count()) > 0) {
        await betaPartnerRow.first().locator('[data-testid*="-delete"]').click();
        const confirmButton = alphaPage.getByRole('button', { name: /cancel partnership/i });
        await confirmButton.click();
        await alphaPage.goto('/partners');
        await expect(alphaPage.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();
        alphaPartnersCard = alphaPage.getByTestId(PARTNERS.LIST_CARD);
        betaPartnerRow = alphaPartnersCard
            .locator('[data-testid^="partners-row-"]')
            .filter({ hasText: 'test-org-beta' });
    }

    // Step 1b: Delete all existing partnerships from Beta's side (cross-org DO entries)
    await betaPage.goto('/partners');
    await expect(betaPage.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();

    let betaPartnersCard = betaPage.getByTestId(PARTNERS.LIST_CARD);
    let alphaPartnerRow = betaPartnersCard
        .locator('[data-testid^="partners-row-"]')
        .filter({ hasText: 'test-org-alpha' });

    while ((await alphaPartnerRow.count()) > 0) {
        await alphaPartnerRow.first().locator('[data-testid*="-delete"]').click();
        const confirmButton = betaPage.getByRole('button', { name: /cancel partnership/i });
        await confirmButton.click();
        await betaPage.goto('/partners');
        await expect(betaPage.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();
        betaPartnersCard = betaPage.getByTestId(PARTNERS.LIST_CARD);
        alphaPartnerRow = betaPartnersCard
            .locator('[data-testid^="partners-row-"]')
            .filter({ hasText: 'test-org-alpha' });
    }

    // Step 2: Beta declines any pending invites FROM Alpha
    // (betaPage is already on /partners from the deletion loop above)

    // Invitations card may not be visible if there are no invitations - check gracefully
    let betaInvitationsCard = betaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
    let invitationsVisible = await betaInvitationsCard.isVisible().catch(() => false);
    let pendingFromAlpha = betaInvitationsCard.getByText('test-org-alpha');
    let count = invitationsVisible ? await pendingFromAlpha.count() : 0;

    while (count > 0) {
        await pendingFromAlpha.first().click();
        await expect(betaPage).toHaveURL(/\/partners\/invite\/accept\/.+/);

        // Beta is receiver, so "Reject" button is visible
        const rejectButton = betaPage.getByTestId(INVITE.REJECT_BUTTON);
        await expect(rejectButton).toBeVisible();
        await rejectButton.click();

        const confirmReject = betaPage.getByTestId(INVITE.CONFIRM_REJECT_BUTTON);
        await expect(confirmReject).toBeVisible();
        await confirmReject.click();

        // Navigate back and re-query
        await betaPage.goto('/partners');
        await expect(betaPage.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();

        // Re-query the locators after page navigation
        betaInvitationsCard = betaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
        invitationsVisible = await betaInvitationsCard.isVisible().catch(() => false);
        pendingFromAlpha = betaInvitationsCard.getByText('test-org-alpha');
        count = invitationsVisible ? await pendingFromAlpha.count() : 0;
    }

    // Step 3: Also check if Alpha has any pending invites showing Beta
    // (in case the UI shows outbound invites too)
    await alphaPage.goto('/partners');
    await expect(alphaPage.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();

    // Invitations card may not be visible if there are no invitations - check gracefully
    let alphaInvitationsCard = alphaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
    invitationsVisible = await alphaInvitationsCard.isVisible().catch(() => false);
    let pendingWithBeta = alphaInvitationsCard.getByText('test-org-beta');
    count = invitationsVisible ? await pendingWithBeta.count() : 0;

    while (count > 0) {
        await pendingWithBeta.first().click();
        await expect(alphaPage).toHaveURL(/\/partners\/invite\/accept\/.+/);

        // Alpha is sender, button might say "Cancel"
        // But for safe cleanup, we try to reject/cancel whatever is available
        const cancelButton = alphaPage.getByTestId(INVITE.REJECT_BUTTON);
        if (await cancelButton.isVisible()) {
            await cancelButton.click();
            const confirmReject = alphaPage.getByTestId(INVITE.CONFIRM_REJECT_BUTTON);
            if (await confirmReject.isVisible()) {
                await confirmReject.click();
            }
        }

        await alphaPage.goto('/partners');
        await expect(alphaPage.getByTestId(PARTNERS.LIST_CARD)).toBeVisible();

        alphaInvitationsCard = alphaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
        invitationsVisible = await alphaInvitationsCard.isVisible().catch(() => false);
        pendingWithBeta = alphaInvitationsCard.getByText('test-org-beta');
        count = invitationsVisible ? await pendingWithBeta.count() : 0;
    }
}

/**
 * Create a partnership between Alpha and Beta and wait for it to be accepted.
 */
export async function createAndAcceptPartnership(alphaPage: Page, betaPage: Page): Promise<void> {
    // Alpha creates invite
    await alphaPage.goto('/partners');
    await alphaPage.getByTestId(PARTNERS.CREATE_BUTTON).click();
    await alphaPage.waitForURL('/partners/invite');
    await alphaPage.getByTestId(INVITE.ORG_ID_INPUT).fill('test-org-beta');
    await alphaPage.getByTestId(INVITE.MESSAGE_INPUT).fill('E2E test invite');
    await alphaPage.getByTestId(INVITE.SEND_BUTTON).click();
    await alphaPage.waitForURL('/partners');

    // Beta accepts
    await betaPage.goto('/partners');
    const invitationsCard = betaPage.getByTestId(PARTNERS.INVITATIONS_CARD);
    await expect(invitationsCard).toBeVisible();
    await invitationsCard.getByText('test-org-alpha').click();
    await expect(betaPage).toHaveURL(/\/partners\/invite\/accept\/.+/);
    await betaPage.getByTestId(INVITE.ACCEPT_BUTTON).click();
    await betaPage.waitForURL('/partners');
}
