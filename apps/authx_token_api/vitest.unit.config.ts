import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';

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

	// Mock user data for unit tests
	const mockUserData = {
		userId: 'test-user-id',
		email: 'test@example.com',
		zitadelRoles: ['platform-admin'],
	};

	return Response.json(mockUserData);
};

export default defineWorkersConfig({
	logLevel: 'info',
	test: {
		// No global setup for unit tests - they should be fast and isolated
		poolOptions: {
			workers: {
				// Don't use wrangler config for unit tests - define everything inline
				main: 'src/index.ts',
				singleWorker: true,
				isolatedStorage: true,
				miniflare: {
					compatibilityDate: '2025-04-01',
					compatibilityFlags: ['nodejs_compat'],
					durableObjects: {
						KEY_PROVIDER: 'JWTKeyProvider',
					},
					// Only include the services needed for unit tests
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
