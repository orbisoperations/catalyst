import { test, expect } from './fixtures/auth';
import {
    createChannel,
    deleteChannel,
    verifyChannelDetails,
    verifyChannelInList,
    verifyTopBarOrganization,
} from './utils/test-helpers';
import { CHANNELS, CREATE_CHANNEL, NAVBAR } from './utils/test-id-constants';

/**
 * Data Channel Creation Tests
 *
 * Test the complete flow of creating a data channel as a data-custodian user,
 * including form validation, navigation, list verification, and cleanup.
 *
 * NOTE: These tests run serially to avoid overwhelming backend workers
 * when multiple browsers hit the data_channel_registrar simultaneously.
 */

test.describe('Create Data Channel', () => {
    // Run serially to prevent backend connection issues from parallel execution
    test.describe.configure({ mode: 'serial' });
    test('should create a data channel and verify it appears in the list', async ({ dataCustodianPage: page }) => {
        // Verify org context first (critical check)
        await page.goto('/');
        await verifyTopBarOrganization(page, 'test-org-alpha');

        // Test data
        const channelData = {
            name: `Test Channel ${Date.now()}`,
            description: 'E2E test channel for Playwright automation',
            endpoint: 'https://catalyst-demo-vehicle-producer-adapter.fly.dev/graphql',
        };

        // Navigate to channels list (required before createChannel)
        await page.getByTestId(NAVBAR.CHANNELS_LINK).click();
        await page.waitForURL('/channels');

        // Create channel (assumes page is on /channels)
        const channelId = await createChannel(page, channelData);
        expect(channelId).toBeTruthy();

        // Verify details page
        await verifyChannelDetails(page, channelData);

        // Navigate back to list and verify channel appears
        await page.getByTestId(NAVBAR.CHANNELS_LINK).click();
        await page.waitForURL('/channels');
        await verifyChannelInList(page, channelId, channelData);

        // Cleanup: delete the channel (page is already on /channels)
        await deleteChannel(page, channelId);
    });

    test('should cancel channel creation and return to list', async ({ dataCustodianPage: page }) => {
        // Navigate to channels list first, then to create page
        await page.goto('/');
        await page.getByTestId(NAVBAR.CHANNELS_LINK).click();
        await page.waitForURL('/channels');

        await page.getByTestId(CHANNELS.CREATE_BUTTON).click();
        await page.waitForURL('/channels/create');

        // Fill form partially
        const nameInput = page.getByTestId(CREATE_CHANNEL.NAME_INPUT);
        await nameInput.fill('Test Channel');

        // Click cancel
        const cancelButton = page.getByTestId(CREATE_CHANNEL.CANCEL_BUTTON);
        await cancelButton.click();

        // Verify returned to channels list
        await page.waitForURL('/channels');
        expect(page.url()).toContain('/channels');

        // Verify the create form is no longer visible
        await expect(page.getByTestId(CREATE_CHANNEL.NAME_INPUT)).not.toBeVisible();

        // Verify the channels create button is visible again (confirming we're on list view)
        await expect(page.getByTestId(CHANNELS.CREATE_BUTTON)).toBeVisible();
    });
});
