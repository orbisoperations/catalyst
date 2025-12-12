import { expect, Page } from '@playwright/test';
import { NAVBAR, CHANNELS, CREATE_CHANNEL } from './test-id-constants';

/**
 * Verify the organization displayed in the TopBar
 */
export async function verifyTopBarOrganization(page: Page, expectedOrg: string): Promise<void> {
    const orgElement = page.getByTestId(NAVBAR.USER_ORG_NAME);
    await expect(orgElement).toBeVisible();
    await expect(orgElement).toHaveText(expectedOrg);
}

/**
 * Channel data for creation
 */
export interface ChannelData {
    name: string;
    description: string;
    endpoint: string;
}

/**
 * Create a data channel and return its ID
 * Assumes the page is already on /channels
 */
export async function createChannel(page: Page, data: ChannelData): Promise<string> {
    // Click create button to open modal
    await page.getByTestId(CHANNELS.CREATE_BUTTON).click();

    // Wait for modal to be visible
    await expect(page.getByTestId(CREATE_CHANNEL.NAME_INPUT)).toBeVisible();

    // Fill the form
    await page.getByTestId(CREATE_CHANNEL.NAME_INPUT).fill(data.name);
    await page.getByTestId(CREATE_CHANNEL.DESCRIPTION_INPUT).fill(data.description);
    await page.getByTestId(CREATE_CHANNEL.ENDPOINT_INPUT).fill(data.endpoint);

    // Submit the form
    await page.getByTestId(CREATE_CHANNEL.SUBMIT_BUTTON).click();

    // Wait for redirect to channel detail page
    await page.waitForURL((url) => {
        const pathname = url.pathname;
        const match = pathname.match(/\/channels\/([a-zA-Z0-9-]+)$/);
        return match !== null;
    });

    // Extract channel ID from URL
    const url = page.url();
    const channelId = url.split('/channels/')[1];
    return channelId;
}

/**
 * Verify channel details on the detail page
 */
export async function verifyChannelDetails(page: Page, data: ChannelData): Promise<void> {
    // Verify the page shows channel name
    await expect(page.getByText(data.name)).toBeVisible();
}

/**
 * Verify a channel appears in the channels list
 */
export async function verifyChannelInList(page: Page, channelId: string, data: ChannelData): Promise<void> {
    const channelRow = page.getByTestId(CHANNELS.row(channelId));
    await expect(channelRow).toBeVisible();
    await expect(channelRow).toContainText(data.name);
}

/**
 * Delete a channel from the channels list
 * Assumes the page is already on /channels
 */
export async function deleteChannel(page: Page, channelId: string): Promise<void> {
    // Click the menu button for this channel
    const menuButton = page.getByTestId(CHANNELS.rowMenuButton(channelId));
    await menuButton.click();

    // Click delete button
    const deleteButton = page.getByTestId(CHANNELS.rowDeleteButton(channelId));
    await deleteButton.click();

    // Confirm deletion in modal if present
    const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
    }

    // Verify channel is no longer in list
    await expect(page.getByTestId(CHANNELS.row(channelId))).not.toBeVisible();
}
