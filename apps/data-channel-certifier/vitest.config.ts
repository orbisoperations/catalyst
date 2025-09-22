import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        // Do not load wrangler.jsonc in tests to avoid missing service errors
        miniflare: {
          // Required by @cloudflare/vitest-pool-workers
          compatibilityDate: '2025-04-01',
          // Add any test-only bindings here if needed later
          bindings: {},
        },
      },
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.wrangler/**',
        'test/**',
        'vitest.config.ts',
        'global-setup.ts',
      ],
    },
  },
});
