import { createStandardTestConfig, STANDARD_TEST_PATTERNS, STANDARD_WORKERS } from '@catalyst/test-utils';
import type { AuxiliaryWorker, DurableObjectBinding } from '@catalyst/test-utils';
import { validUsers } from './test/utils/authUtils';

// Handler for Cloudflare Access auth service that works with UserFixture format
const handleCloudflareAccessAuthServiceOutbound = async (req: Request) => {
	if (req.method !== 'GET') {
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

	const userData = validUsers[token] || {
		userId: 'test-user-id',
		email: 'test@example.com',
		zitadelRoles: ['platform-admin'],
	};

	return Response.json(userData);
};

// Custom data_channel_registrar without AUTHX_TOKEN_API binding
// (since authx_token_api is the main worker being tested)
const dataChannelRegistrarForAuthxTokenApi: AuxiliaryWorker = {
	name: 'data_channel_registrar',
	scriptPath: STANDARD_WORKERS.dataChannelRegistrar().scriptPath,
	modulesRoot: STANDARD_WORKERS.dataChannelRegistrar().modulesRoot,
	entrypoint: STANDARD_WORKERS.dataChannelRegistrar().entrypoint,
	durableObjects: STANDARD_WORKERS.dataChannelRegistrar().durableObjects,
	unsafeEphemeralDurableObjects: true,
	serviceBindings: {
		// Remove AUTHX_TOKEN_API since authx_token_api is the main worker
		AUTHZED: 'authx_authzed_api',
		USERCACHE: 'user-credentials-cache',
	},
};

export default createStandardTestConfig({
	unit: {
		name: 'unit',
		include: [STANDARD_TEST_PATTERNS.unit],
		main: 'src/index.ts',
		durableObjects: [{ name: 'KEY_PROVIDER', className: 'JWTKeyProvider' }] as DurableObjectBinding[],
		serviceBindings: [{ name: 'USERCACHE', workerName: 'user-credentials-cache' }],
		auxiliaryWorkers: [STANDARD_WORKERS.userCredentialsCache(undefined, handleCloudflareAccessAuthServiceOutbound)],
	},
	integration: {
		name: 'integration',
		include: [STANDARD_TEST_PATTERNS.integration],
		globalSetup: './global-setup.ts',
		globalTeardown: './global-teardown.ts',
		main: 'src/index.ts',
		wranglerConfigPath: './wrangler.jsonc',
		workerName: 'authx_token_api',
		durableObjects: [{ name: 'KEY_PROVIDER', className: 'JWTKeyProvider' }] as DurableObjectBinding[],
		auxiliaryWorkers: [
			dataChannelRegistrarForAuthxTokenApi,
			STANDARD_WORKERS.authxAuthzedApi(),
			STANDARD_WORKERS.userCredentialsCache(undefined, handleCloudflareAccessAuthServiceOutbound),
			STANDARD_WORKERS.issuedJwtRegistry(),
		],
	},
});
