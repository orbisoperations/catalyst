import { defineConfig } from 'vitest/config';
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';
import { validUsers } from './test/utils/authUtils';

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
					include: ['test/unit/**/*.spec.ts'],
					poolOptions: {
						workers: {
							main: 'src/index.ts',
							singleWorker: true,
							isolatedStorage: true,
							miniflare: {
								compatibilityDate: '2025-04-01',
								compatibilityFlags: ['nodejs_compat'],
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
										compatibilityDate: '2025-04-01',
										compatibilityFlags: ['nodejs_compat'],
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
					include: ['test/integration/**/*.spec.ts'],
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
								durableObjects: {
									KEY_PROVIDER: 'JWTKeyProvider',
								},
								workers: [
									{
										name: 'data_channel_registrar',
										modules: true,
										modulesRoot: path.resolve('../data_channel_registrar'),
										scriptPath: path.resolve('../data_channel_registrar/dist/worker.js'),
										compatibilityDate: '2025-04-01',
										compatibilityFlags: ['nodejs_compat'],
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
										compatibilityDate: '2025-04-01',
										compatibilityFlags: ['nodejs_compat'],
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
										compatibilityDate: '2025-04-01',
										compatibilityFlags: ['nodejs_compat'],
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
										compatibilityDate: '2025-04-01',
										compatibilityFlags: ['nodejs_compat'],
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
