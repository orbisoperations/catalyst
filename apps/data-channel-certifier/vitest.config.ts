import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        // Do not load wrangler.jsonc in tests to avoid missing service errors
        miniflare: {
          compatibilityDate: '2025-04-01',
          compatibilityFlags: ['nodejs_compat'],
          // Add any test-only bindings here if needed later
          bindings: {},
        },
      },
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
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
    },
  },
});
