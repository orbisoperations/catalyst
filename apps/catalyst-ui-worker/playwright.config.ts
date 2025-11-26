import { defineConfig, devices } from '@playwright/test';
import os from 'os';

/**
 * Playwright Configuration for Catalyst UI Worker
 *
 * This configuration supports:
 * - Multiple browsers (Chromium, Firefox, WebKit)
 * - Accessibility testing with axe-core
 * - Visual regression testing
 * - Mobile device emulation
 * - CI/CD integration
 *
 */

export default defineConfig({
    // Global setup and teardown for backend workers
    globalSetup: './playwright.global-setup.ts',
    globalTeardown: './playwright.global-teardown.ts',

    // Test directory - only E2E tests, not unit tests
    testDir: './test/e2e',

    // Ignore unit tests (they use Vitest, not Playwright)
    testIgnore: ['**/unit/**', '**/setup/**'],

    // Global test timeout (reduced from 30s to catch slow tests earlier)
    timeout: 15 * 1000,

    // Expect timeout for assertions
    expect: {
        timeout: 5000,
    },

    // Run tests in files in parallel
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only
    forbidOnly: !!process.env.CI,

    // Retry on CI only (reduced from 2 to 1 to catch flaky tests faster)
    retries: process.env.CI ? 1 : 0,

    // Number of workers - balance speed vs resource usage
    // CI: 2 workers for stability
    // Local: cap at 4 to avoid overwhelming dev machines
    workers: process.env.CI ? 2 : Math.min(4, os.cpus().length),

    // Reporter configuration
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['list'],
        ...(process.env.CI ? [['github'] as const] : []),
    ],

    // Shared settings for all projects
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000',

        // Collect trace on failure
        trace: 'on-first-retry',

        // Screenshot on failure
        screenshot: 'only-on-failure',

        // Video on failure
        video: 'retain-on-failure',

        // Maximum time for navigation
        navigationTimeout: 10000,

        // Action timeout
        actionTimeout: 10000,
    },

    // Configure projects for major browsers
    projects: [
        // Desktop browsers
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 720 },
            },
        },

        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1280, height: 720 },
            },
        },

        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
                viewport: { width: 1280, height: 720 },
            },
        },

        // Mobile browsers (for responsive testing)
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
        },

        {
            name: 'mobile-safari',
            use: { ...devices['iPhone 13'] },
        },

        // Tablet
        {
            name: 'tablet',
            use: { ...devices['iPad Pro'] },
        },
    ],

    // Run UI via opennextjs-cloudflare preview
    // Backend workers are started in globalSetup via wrangler dev
    // Service bindings work natively because all workers use wrangler's local registry
    webServer: {
        command: 'opennextjs-cloudflare build && opennextjs-cloudflare preview -- --port=4000',
        url: 'http://localhost:4000',
        reuseExistingServer: !process.env.CI,
        timeout: 180 * 1000, // Allow time for Next.js build + worker startup
        env: {
            NODE_ENV: 'test',
        },
    },
});
