import { createSimpleWorkerTestConfig, STANDARD_WORKERS } from '@catalyst/test-utils';
import type { AuxiliaryWorker } from '@catalyst/test-utils';
import path from 'node:path';

// Custom authx_token_api worker with mock usercache binding
const authxTokenApiWithMockCache: AuxiliaryWorker = {
    name: 'authx_token_api',
    scriptPath: STANDARD_WORKERS.authxTokenApi().scriptPath,
    modulesRoot: STANDARD_WORKERS.authxTokenApi().modulesRoot,
    entrypoint: STANDARD_WORKERS.authxTokenApi().entrypoint,
    durableObjects: STANDARD_WORKERS.authxTokenApi().durableObjects,
    unsafeEphemeralDurableObjects: true,
    serviceBindings: {
        DATA_CHANNEL_REGISTRAR: 'data_channel_registrar',
        ISSUED_JWT_REGISTRY: 'issued-jwt-registry',
        AUTHZED: 'authx_authzed_api',
        USERCACHE: 'mock-usercache', // Use mock instead of real usercache
    },
};

// Custom data_channel_registrar with mock-usercache binding
// (since data_channel_gateway uses mock-usercache instead of real user-credentials-cache)
const dataChannelRegistrarWithMockCache: AuxiliaryWorker = {
    name: 'data_channel_registrar',
    scriptPath: STANDARD_WORKERS.dataChannelRegistrar().scriptPath,
    modulesRoot: STANDARD_WORKERS.dataChannelRegistrar().modulesRoot,
    entrypoint: STANDARD_WORKERS.dataChannelRegistrar().entrypoint,
    durableObjects: STANDARD_WORKERS.dataChannelRegistrar().durableObjects,
    unsafeEphemeralDurableObjects: true,
    serviceBindings: {
        AUTHX_TOKEN_API: 'authx_token_api',
        AUTHZED: 'authx_authzed_api',
        USERCACHE: 'mock-usercache', // Use mock instead of real usercache
    },
};

// Custom issued-jwt-registry with mock-usercache binding
// (since data_channel_gateway uses mock-usercache instead of real user-credentials-cache)
const issuedJwtRegistryWithMockCache: AuxiliaryWorker = {
    name: 'issued-jwt-registry',
    scriptPath: STANDARD_WORKERS.issuedJwtRegistry().scriptPath,
    modulesRoot: STANDARD_WORKERS.issuedJwtRegistry().modulesRoot,
    entrypoint: STANDARD_WORKERS.issuedJwtRegistry().entrypoint,
    durableObjects: STANDARD_WORKERS.issuedJwtRegistry().durableObjects,
    unsafeEphemeralDurableObjects: true,
    serviceBindings: {
        USERCACHE: 'mock-usercache', // Use mock instead of real usercache
    },
};

export default createSimpleWorkerTestConfig({
    maxConcurrency: 1,
    globalSetup: './global-setup.ts',
    main: 'src/index.ts',
    singleWorker: true,
    isolatedStorage: false,
    wranglerConfigPath: './wrangler.jsonc',
    durableObjects: {
        DATA_CHANNEL_REGISTRAR_DO: {
            className: 'Registrar',
            scriptName: 'data_channel_registrar',
        },
        JWT_TOKEN_DO: {
            className: 'JWTKeyProvider',
            scriptName: 'authx_token_api',
        },
        JWT_REGISTRY_DO: {
            className: 'I_JWT_Registry_DO',
            scriptName: 'issued-jwt-registry',
        },
    },
    unsafeEphemeralDurableObjects: true,
    serviceBindings: {
        AUTHZED: 'authx_authzed_api',
    },
    auxiliaryWorkers: [
        authxTokenApiWithMockCache,
        dataChannelRegistrarWithMockCache,
        STANDARD_WORKERS.authxAuthzedApi(),
        issuedJwtRegistryWithMockCache,
        STANDARD_WORKERS.mockUsercache(path.resolve('./tests/__mocks__/usercache.js')),
    ],
});
