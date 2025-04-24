import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';

export default defineWorkersConfig({
	test: {
		globalSetup: './global-setup.ts',
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				singleWorker: false,
				isolatedStorage: false,
				miniflare: {
					unsafeEphemeralDurableObjects: true,
					durable_objects: {
						bindings: [
							{
								name: 'ORG_MATCHMAKING',
								class_name: 'OrganizationMatchmakingDO',
							},
						],
					},
					workers: [
						{
							name: 'user-credentials-cache',
							modules: true,
							modulesRoot: path.resolve('../user_credentials_cache'),
							scriptPath: path.resolve('../user_credentials_cache/dist/index.js'),
							compatibilityDate: '2025-04-01',
							compatibilityFlags: ['nodejs_compat'],
							entrypoint: 'UserCredsCacheWorker',
							durableObjects: {
								CACHE: 'UserCredsCache',
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
						},
					],
				},
			},
		},
	},
});