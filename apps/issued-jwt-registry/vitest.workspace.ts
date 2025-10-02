import { defineWorkspace } from 'vitest/config';
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkspace([
	// Unit Tests - Fast, isolated, direct method testing
	defineWorkersProject({
		test: {
			name: 'unit',
			include: ['tests/unit/**/*.test.ts'],
			poolOptions: {
				workers: {
					singleWorker: true,
					isolatedStorage: true, // Clean state per test
					main: 'src/index.ts',
					miniflare: {
						compatibilityDate: '2025-04-01',
						compatibilityFlags: ['nodejs_compat'],
						unsafeEphemeralDurableObjects: true,
						durableObjects: {
							ISSUED_JWT_REGISTRY_DO: 'I_JWT_Registry_DO',
						},
						serviceBindings: {
							USERCACHE: 'mock-usercache',
						},
						workers: [
							{
								name: 'mock-usercache',
								modules: true,
								script: `
									import { WorkerEntrypoint } from 'cloudflare:workers';

									export default class UserCredsCacheWorker extends WorkerEntrypoint {
										async getUser(token) {
											// Mock always returns undefined to simulate auth failure
											return undefined;
										}
									}
								`,
								compatibilityDate: '2025-04-01',
								compatibilityFlags: ['nodejs_compat'],
							},
						],
					},
				},
			},
			coverage: {
				provider: 'istanbul',
				reporter: ['text', 'html', 'json-summary', 'lcov'],
				reportsDirectory: './coverage/unit',
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
	}),

	// Integration Tests - Full service bindings and auxiliary workers
	defineWorkersProject({
		test: {
			name: 'integration',
			include: ['tests/integration/**/*.spec.ts'],
			globalSetup: './global-setup.ts', // Build user-credentials-cache
			poolOptions: {
				workers: {
					singleWorker: true,
					isolatedStorage: true,
					wrangler: { configPath: './wrangler.jsonc' },
					miniflare: {
						unsafeEphemeralDurableObjects: true,
						workers: [
							{
								name: 'user-credentials-cache',
								modules: true,
								modulesRoot: '../user-credentials-cache',
								scriptPath: '../user-credentials-cache/dist/index.js',
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
				provider: 'istanbul',
				reporter: ['text', 'html', 'json-summary', 'lcov'],
				reportsDirectory: './coverage/integration',
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
	}),
]);
