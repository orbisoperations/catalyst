import { createSimpleWorkerTestConfig } from '@catalyst/test-utils';

export default createSimpleWorkerTestConfig({
	wranglerConfigPath: './wrangler.jsonc',
	singleWorker: false,
	isolatedStorage: false,
});
