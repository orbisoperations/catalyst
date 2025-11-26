import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	logLevel: 'info',
	test: {
		globalSetup: './global-setup.ts',
		globalTeardown: './global-teardown.ts',
		poolOptions: {
			workers: {
				wrangler: {
					configPath: './wrangler.jsonc',
				},
				isolatedStorage: false,
				singleWorker: true,
				miniflare: {
					compatibilityDate: '2025-04-01',
					compatibilityFlags: ['nodejs_compat'],
					bindings: {
						AUTHZED_ENDPOINT: 'http://localhost:8449',
						AUTHZED_KEY: 'atoken',
						AUTHZED_PREFIX: 'orbisops_catalyst_dev/',
					},
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
