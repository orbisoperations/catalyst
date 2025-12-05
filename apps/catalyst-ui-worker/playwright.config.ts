import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Catalyst UI Worker
 *
 * Simplified config for initial setup verification.
 */

export default defineConfig({
    // Global setup/teardown disabled for now
    // globalSetup: './playwright.global-setup.ts',
    // globalTeardown: './playwright.global-teardown.ts',

    testDir: './test/e2e',

    // Global test timeout
    timeout: 30 * 1000,

    expect: {
        timeout: 5000,
    },

    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : 1,

    reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],

    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:4000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
