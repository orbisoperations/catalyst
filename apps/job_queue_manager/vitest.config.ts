import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
    test: {
        poolOptions: {
            workers: {
                wrangler: {
                    configPath: './wrangler.jsonc',
                },
                main: 'src/server.ts',
                singleWorker: true,
                isolatedStorage: false,
                miniflare: {
                    compatibilityFlags: ['nodejs_compat'],
                },
            },
        },
        coverage: {
            provider: 'istanbul',
            reporter: ['text', 'html', 'json-summary'],
            reportsDirectory: './coverage',
            include: ['src/**/*.{ts,js}'],
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/test/**',
                '**/tests/**',
                '**/*.{test,spec}.?(c|m)[jt]s?(x)',
                '**/wrangler.*',
                '**/vitest.config.*',
                '**/.wrangler/**',
                '**/env.d.ts',
                '**/global-setup.ts',
            ],
        },
    },
});
