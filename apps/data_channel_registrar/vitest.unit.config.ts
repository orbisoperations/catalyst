import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';

export default defineWorkersConfig({
  resolve: {
    alias: {
      '@catalyst/schema_zod': path.resolve(__dirname, '../../packages/schema_zod'),
    },
  },
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: false,
        singleWorker: true,
        miniflare: {
          compatibilityDate: '2025-04-01',
          compatibilityFlags: ['nodejs_compat'],
          // No service bindings or durable objects needed for unit tests
          // We just need the runtime environment for imports
        },
      },
    },
    // Only include unit tests
    include: ['test/unit/**/*.spec.ts'],
    exclude: ['test/integration/**/*.spec.ts'],
  },
});
