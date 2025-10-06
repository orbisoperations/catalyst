import { defineConfig } from 'vitest/config';
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';

export default defineConfig({
	test: {
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
				'**/vitest.config.*',
				'**/.wrangler/**',
				'**/env.d.ts',
				'**/global-setup.ts',
			],
		},
		// Modern projects pattern instead of deprecated workspace
		projects: [
			// Unit Tests - Fast, isolated, direct method testing
			defineWorkersProject({
				test: {
					name: 'unit',
					include: ['tests/unit/**/*.test.ts'],
					poolOptions: {
						workers: {
							main: 'src/index.ts',
							singleWorker: true,
							isolatedStorage: true,
							miniflare: {
								compatibilityDate: '2025-04-01',
								compatibilityFlags: ['nodejs_compat'],
								durableObjects: {
									ISSUED_JWT_REGISTRY_DO: 'I_JWT_Registry_DO',
								},
								serviceBindings: {
									// Use mock worker for faster, isolated unit tests
									USERCACHE: 'mock-usercache',
								},
								workers: [
									{
										name: 'mock-usercache',
										modules: true,
										scriptPath: path.resolve('./tests/unit/__mocks__/usercache.js'),
										compatibilityDate: '2025-04-01',
										compatibilityFlags: ['nodejs_compat'],
									},
								],
							},
						},
					},
				},
			}),

			// Integration Tests - Full service bindings and auxiliary workers
			defineWorkersProject({
				test: {
					name: 'integration',
					include: ['tests/integration/**/*.spec.ts'],
					globalSetup: './global-setup.ts',
					poolOptions: {
						workers: {
							wrangler: { configPath: './wrangler.jsonc' },
							main: 'src/index.ts',
							singleWorker: true,
							isolatedStorage: true,
							miniflare: {
								compatibilityDate: '2025-04-01',
								compatibilityFlags: ['nodejs_compat'],
								unsafeEphemeralDurableObjects: true,
								durableObjects: {
									ISSUED_JWT_REGISTRY_DO: 'I_JWT_Registry_DO',
								},
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
				},
			}),
		],
	},
});
