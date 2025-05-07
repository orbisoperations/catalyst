import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				singleWorker: false,
				isolatedStorage: false,
			},
		},
		coverage: {
			provider: 'istanbul',
			reporter: ['text', 'json', 'html'],
		},
	},
});
