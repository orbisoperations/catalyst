import { Page, expect } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { NAVBAR } from '../TEST_ID_CONSTANTS';

/**
 * Test Helper Utilities for Catalyst UI Worker
 *
 * Common functions used across multiple test files to reduce duplication
 * and maintain consistency in test patterns.
 */

/**
 * Wait for navigation to complete and verify URL
 */
export async function expectNavigation(
    page: Page,
    expectedPath: string,
    options: { timeout?: number } = {}
): Promise<void> {
    await page.waitForURL(`**${expectedPath}`, {
        timeout: options.timeout || 5000,
    });
    expect(page.url()).toContain(expectedPath);
}

/**
 * Fill and submit a form with validation
 */
export async function fillForm(page: Page, fields: Record<string, string>, submitButtonName = 'Submit'): Promise<void> {
    for (const [label, value] of Object.entries(fields)) {
        const input = page.getByLabel(label);
        await expect(input).toBeVisible();
        await input.fill(value);
    }

    const submitButton = page.getByRole('button', { name: submitButtonName });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
}

/**
 * Verify a table contains specific rows
 */
export async function verifyTableRows(
    page: Page,
    expectedRowCount: number,
    options: { includeHeader?: boolean } = {}
): Promise<void> {
    const rows = page.getByRole('row');
    const count = await rows.count();

    if (options.includeHeader) {
        expect(count).toBe(expectedRowCount);
    } else {
        // Subtract 1 for header row
        expect(count).toBe(expectedRowCount + 1);
    }
}

/**
 * Verify a badge is displayed with correct text
 */
export async function verifyBadge(container: Locator | Page, badgeText: string): Promise<void> {
    const badge = container.getByRole('status', { name: badgeText });
    await expect(badge).toBeVisible();
}

/**
 * Open and verify a modal dialog
 */
export async function openModal(page: Page, triggerButtonName: string, expectedModalTitle: string): Promise<Locator> {
    const button = page.getByRole('button', { name: triggerButtonName });
    await button.click();

    const modal = page.getByRole('dialog', { name: expectedModalTitle });
    await expect(modal).toBeVisible();

    // Verify focus is trapped in modal
    const firstFocusableElement = modal.locator('button, input, textarea').first();
    await expect(firstFocusableElement).toBeFocused();

    return modal;
}

/**
 * Close a modal and verify it's hidden
 */
export async function closeModal(
    modal: Locator,
    method: 'escape' | 'close-button' | 'cancel' = 'escape'
): Promise<void> {
    const page = modal.page();

    switch (method) {
        case 'escape':
            await page.keyboard.press('Escape');
            break;
        case 'close-button':
            await modal.getByRole('button', { name: /close/i }).click();
            break;
        case 'cancel':
            await modal.getByRole('button', { name: /cancel/i }).click();
            break;
    }

    await expect(modal).not.toBeVisible();
}

/**
 * Verify validation error message
 */
export async function verifyValidationError(page: Page, fieldLabel: string, expectedError: string): Promise<void> {
    const field = page.getByLabel(fieldLabel);
    const errorMessage = field.locator('..').getByText(expectedError);
    await expect(errorMessage).toBeVisible();
}

/**
 * Select an option from a dropdown/select
 */
export async function selectDropdownOption(page: Page, dropdownLabel: string, optionValue: string): Promise<void> {
    const dropdown = page.getByRole('combobox', { name: dropdownLabel });
    await dropdown.selectOption(optionValue);
}

/**
 * Verify a toast notification appears
 */
export async function verifyToast(page: Page, messageText: string): Promise<void> {
    // Chakra UI toasts typically have role="alert" or "status"
    const toast = page.getByRole('alert').filter({ hasText: messageText });
    await expect(toast).toBeVisible({ timeout: 5000 });
}

/**
 * Wait for a loading spinner to disappear
 */
export async function waitForLoadingComplete(page: Page): Promise<void> {
    // Look for common loading indicators
    const spinner = page.getByTestId('loading-spinner').or(page.getByRole('progressbar'));

    // Wait for spinner to appear and then disappear
    await expect(spinner).not.toBeVisible({ timeout: 10000 });
}

/**
 * Verify empty state message
 */
export async function verifyEmptyState(page: Page, message: string): Promise<void> {
    const emptyState = page.getByText(message);
    await expect(emptyState).toBeVisible();
}

/**
 * Open an actions menu for a table row
 */
export async function openRowActionsMenu(row: Locator, menuName = 'Actions'): Promise<Locator> {
    const menuButton = row.getByRole('button', { name: menuName });
    await menuButton.click();

    const menu = row.page().getByRole('menu');
    await expect(menu).toBeVisible();

    return menu;
}

/**
 * Verify organization display in TopBar (critical for bug prevention)
 */
export async function verifyTopBarOrganization(page: Page, expectedOrg: string): Promise<void> {
    // Use data-testid for reliable element selection
    const logo = page.getByTestId(NAVBAR.LOGO);
    await expect(logo).toBeVisible();

    // CRITICAL: Organization must NOT be "undefined" anywhere on the page
    // This is the key check that would have caught the data-custodian bug
    const undefinedText = page.getByText('undefined', { exact: false });
    await expect(undefinedText).not.toBeVisible();

    // Verify actual org is displayed using data-testid
    const orgText = page.getByTestId(NAVBAR.ORG_NAME);
    await expect(orgText).toBeVisible();
    await expect(orgText).toHaveText(expectedOrg);
}

/**
 * Intercept and validate API request body
 */
export async function interceptAndValidateRequest(
    page: Page,
    urlPattern: string,
    validator: (body: unknown) => void | Promise<void>
): Promise<void> {
    await page.route(urlPattern, async (route) => {
        const request = route.request();
        const body = request.postData() ? JSON.parse(request.postData()!) : undefined;

        // Run validation
        try {
            await validator(body);
            // Continue with the request if validation passes
            await route.continue();
        } catch (error) {
            // Fail the request if validation fails
            await route.abort();
            throw error;
        }
    });
}

/**
 * Take a screenshot for visual regression testing
 */
export async function takeVisualSnapshot(
    page: Page,
    name: string,
    options: {
        fullPage?: boolean;
        element?: Locator;
    } = {}
): Promise<void> {
    if (options.element) {
        await expect(options.element).toHaveScreenshot(`${name}.png`);
    } else {
        await expect(page).toHaveScreenshot(`${name}.png`, {
            fullPage: options.fullPage || false,
        });
    }
}

/**
 * Verify keyboard navigation works correctly
 */
export async function verifyKeyboardNavigation(
    page: Page,
    elements: string[], // Array of accessible names
    key: 'Tab' | 'ArrowDown' | 'ArrowUp' = 'Tab'
): Promise<void> {
    for (const elementName of elements) {
        await page.keyboard.press(key);
        const element = page
            .getByRole('button', { name: elementName })
            .or(page.getByRole('link', { name: elementName }));
        await expect(element).toBeFocused();
    }
}

/**
 * Check for XSS vulnerabilities in displayed content
 */
export async function verifyNoXSS(page: Page, inputValue: string): Promise<void> {
    // After submitting form with potential XSS payload,
    // verify it's displayed as text, not executed
    const displayedText = page.getByText(inputValue);
    await expect(displayedText).toBeVisible();

    // Verify no script execution occurred
    const scriptExecuted = await page.evaluate(() => {
        return (window as Window & { __xss_executed?: boolean }).__xss_executed === true;
    });

    expect(scriptExecuted).toBeFalsy();
}

/**
 * Verify responsive design by testing at different viewport sizes
 */
export async function testResponsiveDesign(page: Page, test: () => Promise<void>): Promise<void> {
    const viewports = [
        { width: 375, height: 667, name: 'Mobile' }, // iPhone SE
        { width: 768, height: 1024, name: 'Tablet' }, // iPad
        { width: 1280, height: 720, name: 'Desktop' },
    ];

    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await test();
    }
}
