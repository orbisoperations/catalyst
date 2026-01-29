import { createStandardTestConfig, STANDARD_TEST_PATTERNS, STANDARD_WORKERS } from '@catalyst/test-utils';
import type { DurableObjectBinding } from '@catalyst/test-utils';
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

    const userData = validUsers[token];
    if (!userData) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json(userData);
};

export default createStandardTestConfig({
    viteOptions: {
        optimizeDeps: {
            entries: ['@graphql-tools/executor-http'],
        },
        logLevel: 'info',
        clearScreen: false,
    },
    unit: {
        name: 'unit',
        include: [STANDARD_TEST_PATTERNS.unit],
        // Unit tests don't need any bindings - just runtime environment
    },
    integration: {
        name: 'integration',
        include: [STANDARD_TEST_PATTERNS.integration],
        globalSetup: './global-setup.ts',
        main: 'src/worker.ts',
        wranglerConfigPath: './wrangler.jsonc',
        durableObjects: [
            { name: 'DO', className: 'Registrar' },
            { name: 'KEY_PROVIDER', className: 'JWTKeyProvider', scriptName: 'authx_token_api' },
        ] as DurableObjectBinding[],
        serviceBindings: [
            { name: 'AUTHZED', workerName: 'authx_authzed_api' },
            { name: 'AUTHX_TOKEN_API', workerName: 'authx_token_api' },
            { name: 'USERCACHE', workerName: 'user-credentials-cache' },
        ],
        auxiliaryWorkers: [
            STANDARD_WORKERS.authxAuthzedApi(),
            STANDARD_WORKERS.authxTokenApi(),
            STANDARD_WORKERS.userCredentialsCache(undefined, handleCloudflareAccessAuthServiceOutbound),
            STANDARD_WORKERS.issuedJwtRegistry(),
        ],
    },
});
