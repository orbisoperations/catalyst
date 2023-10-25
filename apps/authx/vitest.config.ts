import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'miniflare',
		// we can add env vars here
		//https://miniflare.dev/testing/vitest
		// environmentOptions: {

		// }
	},
});
