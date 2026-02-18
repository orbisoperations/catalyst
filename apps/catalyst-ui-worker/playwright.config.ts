import { defineConfig, devices } from '@playwright/test';
import os from 'os';
import { AUTH_FILES } from './test/auth.constants';

/**
 * Playwright Configuration for Catalyst UI Worker
 *
 * This configuration supports:
 * - Multiple browsers (Chromium, Firefox, WebKit)
 * - Accessibility testing with axe-core
 * - Visual regression testing
 * - Mobile device emulation
 * - CI/CD integration
 * - Auth setup project pattern for reliable authentication
 *
 */

export default defineConfig({
    // Global setup and teardown for backend workers
    globalSetup: './playwright.global-setup.ts',
    globalTeardown: './playwright.global-teardown.ts',

    // Test directory - only E2E tests, not unit tests
    testDir: './test',

    // Ignore unit tests (they use Vitest, not Playwright)
    testIgnore: ['**/unit/**', '**/fixtures/**', '**/utils/**', '**/setup/**'],

    // Global test timeout
    timeout: 30 * 1000,

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

    // Configure projects
    projects: [
        // =====================================================================
        // AUTH SETUP PROJECTS - Run first to create auth state files
        // =====================================================================
        {
            name: 'auth-setup',
            testMatch: /auth\.setup\.ts/,
        },

        // =====================================================================
        // DESKTOP BROWSERS - Depend on auth setup
        // =====================================================================
        {
            name: 'chromium',
            testMatch: /e2e\/.*\.spec\.ts/,
            testIgnore: /partners\.(toggle|workflow)\.spec\.ts/,
            dependencies: ['auth-setup'],
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 720 },
                // Default storage state - tests can override per-fixture
                storageState: AUTH_FILES['data-custodian'],
            },
        },

        // Partnership mutation tests run serially — both toggle and workflow specs
        // create partnerships between alpha↔beta, so concurrent runs cause conflicts.
        {
            name: 'chromium-partnerships',
            testMatch: /partners\.(toggle|workflow)\.spec\.ts/,
            dependencies: ['auth-setup'],
            workers: 1,
            fullyParallel: false,
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 720 },
                storageState: AUTH_FILES['data-custodian'],
            },
        },

        {
            name: 'firefox',
            testMatch: /e2e\/.*\.spec\.ts/,
            dependencies: ['auth-setup'],
            use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1280, height: 720 },
                storageState: AUTH_FILES['data-custodian'],
            },
        },

        {
            name: 'webkit',
            testMatch: /e2e\/.*\.spec\.ts/,
            dependencies: ['auth-setup'],
            use: {
                ...devices['Desktop Safari'],
                viewport: { width: 1280, height: 720 },
                storageState: AUTH_FILES['data-custodian'],
            },
        },

        // =====================================================================
        // MOBILE BROWSERS - For responsive testing
        // =====================================================================
        {
            name: 'mobile-chrome',
            testMatch: /e2e\/.*\.spec\.ts/,
            dependencies: ['auth-setup'],
            use: {
                ...devices['Pixel 5'],
                storageState: AUTH_FILES['data-custodian'],
            },
        },

        {
            name: 'mobile-safari',
            testMatch: /e2e\/.*\.spec\.ts/,
            dependencies: ['auth-setup'],
            use: {
                ...devices['iPhone 13'],
                storageState: AUTH_FILES['data-custodian'],
            },
        },

        // Tablet
        {
            name: 'tablet',
            testMatch: /e2e\/.*\.spec\.ts/,
            dependencies: ['auth-setup'],
            use: {
                ...devices['iPad Pro'],
                storageState: AUTH_FILES['data-custodian'],
            },
        },
    ],

    // Run UI via wrangler dev so it can find backend workers via local service registry
    // Backend workers are started in globalSetup via wrangler dev
    // Service bindings work natively because all workers use wrangler's local registry
    webServer: {
        command: 'opennextjs-cloudflare build && pnpm wrangler dev --port=4000 --inspector-port=6000',
        url: 'http://localhost:4000',
        reuseExistingServer: !process.env.CI,
        timeout: 180 * 1000, // Allow time for Next.js build + worker startup
        env: {
            NODE_ENV: 'test',
        },
    },
});
