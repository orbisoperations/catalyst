import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	logLevel: 'info',
	test: {
		globalSetup: './global-setup.ts',
		poolOptions: {
			workers: {
				wrangler: {
					configPath: './wrangler.jsonc',
				},
				isolatedStorage: false,
				singleWorker: true,
				miniflare: {
					compatibilityFlags: ['nodejs_compat'],
					bindings: {
						AUTHZED_ENDPOINT: 'http://localhost:8443',
						AUTHZED_KEY: 'atoken',
						AUTHZED_PREFIX: 'orbisops_catalyst_dev/',
					},
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
				'**/wrangler.jsonc',
				'**/vitest.config.*',
				'**/.wrangler/**',
				'**/env.d.ts',
				'**/global-setup.ts',
			],
		},
	},
});
