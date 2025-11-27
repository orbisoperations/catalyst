import { defineConfig } from 'vitest/config';
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';
// Standardized test configuration values
const STANDARD_COMPATIBILITY_DATE = '2025-04-01';
const STANDARD_COMPATIBILITY_FLAGS = ['nodejs_compat'];
const STANDARD_TEST_PATTERNS = {
	unit: 'test/unit/**/*.spec.ts',
	integration: 'test/integration/**/*.spec.ts',
};

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
				'**/global-teardown.ts',
			],
		},
		// Modern projects pattern instead of deprecated workspace
		projects: [
			// Unit Tests - Fast, isolated, direct method testing
			defineWorkersProject({
				test: {
					name: 'unit',
					include: [STANDARD_TEST_PATTERNS.unit],
					poolOptions: {
						workers: {
							main: 'src/index.ts',
							singleWorker: true,
							isolatedStorage: true,
							miniflare: {
								compatibilityDate: STANDARD_COMPATIBILITY_DATE,
								compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
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
										scriptPath: path.resolve('./test/unit/__mocks__/usercache.js'),
										compatibilityDate: STANDARD_COMPATIBILITY_DATE,
										compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
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
					include: [STANDARD_TEST_PATTERNS.integration],
					globalSetup: './global-setup.ts',
					poolOptions: {
						workers: {
							wrangler: { configPath: './wrangler.jsonc' },
							main: 'src/index.ts',
							singleWorker: true,
							isolatedStorage: true,
							miniflare: {
								compatibilityDate: STANDARD_COMPATIBILITY_DATE,
								compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
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
										compatibilityDate: STANDARD_COMPATIBILITY_DATE,
										compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
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
