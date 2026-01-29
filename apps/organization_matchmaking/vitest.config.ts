import { createSimpleWorkerTestConfig, STANDARD_WORKERS } from '@catalyst/test-utils';

export default createSimpleWorkerTestConfig({
	wranglerConfigPath: './wrangler.jsonc',
	singleWorker: false,
	isolatedStorage: false,
	globalSetup: './global-setup.ts',
	durableObjects: {
		ORG_MATCHMAKING: 'OrganizationMatchmakingDO',
	},
	unsafeEphemeralDurableObjects: true,
	auxiliaryWorkers: [STANDARD_WORKERS.userCredentialsCache(), STANDARD_WORKERS.authxAuthzedApi()],
});
