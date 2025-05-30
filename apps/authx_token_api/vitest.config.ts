import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';
import { validUsers } from './test/utils/authUtils';

const handleCloudflareAccessAuthServiceOutbound = async (req: Request) => {
	// receives
	// headers
	// cookie: CF_Authorization=token
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

	const userData = validUsers[token];

	if (!userData) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}

	return Response.json(userData);
};

export default defineWorkersConfig({
	logLevel: 'info',
	test: {
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
								AUTHZED_ENDPOINT: 'http://localhost:8443',
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
						// add issued-jwt-registry
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
		coverage: {
			provider: 'istanbul',
			reporter: ['text', 'html', 'json-summary'],
			reportsDirectory: './coverage',
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
