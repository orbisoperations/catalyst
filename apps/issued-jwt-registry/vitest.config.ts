import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';

export default defineWorkersConfig({
	esbuild: {
		target: 'ES2022',
	},
	optimizeDeps: {
		entries: ['@graphql-tools/executor-http'],
	},
	clearScreen: false,
	logLevel: 'info',
	test: {
		globalSetup: './global-setup.ts',
		poolOptions: {
			workers: {
				singleWorker: true,
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: {
					unsafeEphemeralDurableObjects: true,
					workers: [
						{
							name: 'user-credentials-cache',
							modules: true,
							modulesRoot: path.resolve('../user-credentials-cache'),
							scriptPath: path.resolve('../user-credentials-cache/dist/index.js'),
							compatibilityDate: '2025-04-01',
							compatibilityFlags: ['nodejs_compat'],
							entrypoint: 'UserCredsCacheWorker',
							unsafeEphemeralDurableObjects: true,
							durableObjects: {
								CACHE: 'UserCredsCache',
							},
						},
					],
				},
			},
		},
		coverage: {
			provider: 'istanbul', // Specified istanbul
			reporter: ['text', 'html', 'json-summary', 'lcov'], // Added lcov for external services
			reportsDirectory: './coverage', // Default output directory
			include: ['src/**/*.{ts,js}'], // Adjust if your source files are elsewhere
			exclude: [
				// Common exclusions
				'**/node_modules/**',
				'**/dist/**',
				'**/test/**',
				'**/tests/**',
				'**/*.{test,spec}.?(c|m)[jt]s?(x)', // Exclude test file patterns
				'**/wrangler.jsonc',
				'**/vitest.config.*',
				'**/.wrangler/**',
				'**/env.d.ts',
				'**/global-setup.ts',
			],
		},
	},
});
