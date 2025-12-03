/**
 * Shared Vitest configuration utilities for Catalyst apps
 *
 * Provides standardized base configurations to ensure consistency
 * across all apps in the monorepo.
 */

/**
 * Standard compatibility date for all Cloudflare Workers
 * All apps should use this date for consistency
 */
export const STANDARD_COMPATIBILITY_DATE = '2025-04-01' as const;

/**
 * Standard compatibility flags for Cloudflare Workers
 */
export const STANDARD_COMPATIBILITY_FLAGS = ['nodejs_compat'] as const;

/**
 * Standard test file patterns
 * All test files should use .spec.ts extension
 */
export const STANDARD_TEST_PATTERNS = {
    unit: 'test/unit/**/*.spec.ts',
    integration: 'test/integration/**/*.spec.ts',
    all: 'test/**/*.spec.ts',
} as const;

/**
 * Standard coverage configuration
 * Ensures consistent coverage reporting across all apps
 */
export const STANDARD_COVERAGE_CONFIG = {
    provider: 'istanbul' as const,
    reporter: ['text', 'html', 'json-summary', 'lcov'] as const,
    reportsDirectory: './coverage',
    include: ['src/**/*.{ts,js}'],
    exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/test/**',
        '**/tests/**',
        '**/*.{test,spec}.?(c|m)[jt]s?(x)',
        '**/wrangler.jsonc',
        '**/wrangler.toml',
        '**/vitest.config.*',
        '**/.wrangler/**',
        '**/env.d.ts',
        '**/global-setup.ts',
        '**/global-teardown.ts',
    ],
} as const;

/**
 * Standard AuthZed bindings for test environments
 */
export const STANDARD_AUTHZED_BINDINGS = {
    AUTHZED_ENDPOINT: 'http://localhost:8449',
    AUTHZED_KEY: 'atoken',
    AUTHZED_PREFIX: 'orbisops_catalyst_dev/',
} as const;

/**
 * Helper to create a standard worker configuration
 * Ensures all workers use consistent compatibility settings
 */
export function createStandardWorkerConfig(overrides?: { compatibilityDate?: string; compatibilityFlags?: string[] }) {
    return {
        compatibilityDate: overrides?.compatibilityDate ?? STANDARD_COMPATIBILITY_DATE,
        compatibilityFlags: overrides?.compatibilityFlags ?? [...STANDARD_COMPATIBILITY_FLAGS],
    };
}
