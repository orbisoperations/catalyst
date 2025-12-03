import { createSimpleWorkerTestConfig, STANDARD_AUTHZED_BINDINGS } from '@catalyst/test-utils';

export default createSimpleWorkerTestConfig({
	logLevel: 'info',
	globalSetup: './global-setup.ts',
	globalTeardown: './global-teardown.ts',
	wranglerConfigPath: './wrangler.jsonc',
	isolatedStorage: false,
	singleWorker: true,
	bindings: {
		AUTHZED_ENDPOINT: STANDARD_AUTHZED_BINDINGS.AUTHZED_ENDPOINT,
		AUTHZED_KEY: STANDARD_AUTHZED_BINDINGS.AUTHZED_KEY,
		AUTHZED_PREFIX: STANDARD_AUTHZED_BINDINGS.AUTHZED_PREFIX,
	},
});
