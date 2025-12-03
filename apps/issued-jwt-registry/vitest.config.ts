import { createStandardTestConfig, STANDARD_TEST_PATTERNS, STANDARD_WORKERS } from '@catalyst/test-utils';
import type { DurableObjectBinding } from '@catalyst/test-utils';
import path from 'path';

export default createStandardTestConfig({
	unit: {
		name: 'unit',
		include: [STANDARD_TEST_PATTERNS.unit],
		main: 'src/index.ts',
		durableObjects: [{ name: 'ISSUED_JWT_REGISTRY_DO', className: 'I_JWT_Registry_DO' }] as DurableObjectBinding[],
		serviceBindings: [{ name: 'USERCACHE', workerName: 'mock-usercache' }],
		auxiliaryWorkers: [STANDARD_WORKERS.mockUsercache(path.resolve('./test/unit/__mocks__/usercache.js'))],
	},
	integration: {
		name: 'integration',
		include: [STANDARD_TEST_PATTERNS.integration],
		globalSetup: './global-setup.ts',
		main: 'src/index.ts',
		wranglerConfigPath: './wrangler.jsonc',
		durableObjects: [{ name: 'ISSUED_JWT_REGISTRY_DO', className: 'I_JWT_Registry_DO' }] as DurableObjectBinding[],
		auxiliaryWorkers: [STANDARD_WORKERS.userCredentialsCache()],
	},
});
