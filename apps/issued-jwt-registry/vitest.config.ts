// @ts-ignore
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';

export default defineWorkersProject({
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
	},
});
