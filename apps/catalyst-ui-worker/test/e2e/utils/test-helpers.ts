import { expect, Page } from '@playwright/test';
import { TOPBAR } from './test-id-constants';

/**
 * Verify the organization displayed in the TopBar
 */
export async function verifyTopBarOrganization(page: Page, expectedOrg: string): Promise<void> {
    const orgElement = page.getByTestId(TOPBAR.USER_ORG_NAME);
    await expect(orgElement).toBeVisible();
    await expect(orgElement).toHaveText(expectedOrg);
}
