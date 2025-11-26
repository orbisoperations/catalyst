import { defineConfig } from 'vitest/config';
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';
import { validUsers } from './test/utils/authUtils';
// Standardized test configuration values
const STANDARD_COMPATIBILITY_DATE = '2025-04-01';
const STANDARD_COMPATIBILITY_FLAGS = ['nodejs_compat'];
const STANDARD_TEST_PATTERNS = {
	unit: 'test/unit/**/*.spec.ts',
	integration: 'test/integration/**/*.spec.ts',
};

// Shared outbound service handler for mocking Cloudflare Access
const handleCloudflareAccessAuthServiceOutbound = async (req: Request) => {
	if (req.method != 'GET') {
		return Response.json({ error: 'Not found' }, { status: 404 });
	}

	let token = req.headers.get('cookie');
	if (!token) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}
	token = token.split('=')[1];
	if (!token) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userData = validUsers[token] || {
		userId: 'test-user-id',
		email: 'test@example.com',
		zitadelRoles: ['platform-admin'],
	};

	return Response.json(userData);
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
				'**/wrangler.toml',
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
									KEY_PROVIDER: 'JWTKeyProvider',
								},
								serviceBindings: {
									USERCACHE: 'user-credentials-cache',
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
										outboundService: handleCloudflareAccessAuthServiceOutbound,
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
					globalTeardown: './global-teardown.ts',
					poolOptions: {
						workers: {
							wrangler: { configPath: './wrangler.jsonc' },
							main: 'src/index.ts',
							singleWorker: true,
							isolatedStorage: true,
							miniflare: {
								name: 'authx_token_api',
								compatibilityDate: STANDARD_COMPATIBILITY_DATE,
								compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
								durableObjects: {
									KEY_PROVIDER: 'JWTKeyProvider',
								},
								workers: [
									{
										name: 'data_channel_registrar',
										modules: true,
										modulesRoot: path.resolve('../data_channel_registrar'),
										scriptPath: path.resolve('../data_channel_registrar/dist/worker.js'),
										compatibilityDate: STANDARD_COMPATIBILITY_DATE,
										compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
										entrypoint: 'RegistrarWorker',
										durableObjects: {
											DO: 'Registrar',
										},
										serviceBindings: {
											AUTHZED: 'authx_authzed_api',
											USERCACHE: 'user-credentials-cache',
										},
									},
									{
										name: 'authx_authzed_api',
										modules: true,
										modulesRoot: path.resolve('../authx_authzed_api'),
										scriptPath: path.resolve('../authx_authzed_api/dist/index.js'),
										compatibilityDate: STANDARD_COMPATIBILITY_DATE,
										compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
										entrypoint: 'AuthzedWorker',
										bindings: {
											AUTHZED_ENDPOINT: 'http://localhost:8449',
											AUTHZED_KEY: 'atoken',
											AUTHZED_PREFIX: 'orbisops_catalyst_dev/',
										},
									},
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
										outboundService: handleCloudflareAccessAuthServiceOutbound,
									},
									{
										name: 'issued-jwt-registry',
										modules: true,
										modulesRoot: path.resolve('../issued-jwt-registry'),
										scriptPath: path.resolve('../issued-jwt-registry/dist/index.js'),
										compatibilityDate: STANDARD_COMPATIBILITY_DATE,
										compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
										entrypoint: 'IssuedJWTRegistryWorker',
										durableObjects: {
											ISSUED_JWT_REGISTRY_DO: 'I_JWT_Registry_DO',
										},
										serviceBindings: {
											USERCACHE: 'user-credentials-cache',
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
