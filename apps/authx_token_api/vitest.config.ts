import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';

export default defineWorkersConfig({
  logLevel: 'info',
	test: {
    globalSetup: './global-setup.ts',
		poolOptions: {
			workers: {
        wrangler: { configPath: './wrangler.jsonc' },
        main: 'src/worker.ts',
				singleWorker: true,
				isolatedStorage: false,
				miniflare: {
          compatibilityDate: '2025-04-01',
          compatibilityFlags: ['nodejs_compat'],
					workers: [
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
							modulesRoot: path.resolve('../user_credentials_cache'),
							scriptPath: path.resolve('../user_credentials_cache/dist/index.js'),
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
});
