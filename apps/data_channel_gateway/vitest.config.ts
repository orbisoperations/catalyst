import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';
import { Logger } from 'tslog';
// Standardized test configuration values
const STANDARD_COMPATIBILITY_DATE = '2025-04-01';
const STANDARD_COMPATIBILITY_FLAGS = ['nodejs_compat'];

const logger = new Logger({});

const authxServicePath = path.resolve('../authx_token_api/dist/index.js');
const dataChannelRegistrarPath = path.resolve('../data_channel_registrar/dist/worker.js');
const authzedServicePath = path.resolve('../authx_authzed_api/dist/index.js');
const jwtRegistryPath = path.resolve('../issued-jwt-registry/dist/index.js');

logger.info('Using built services from other workspaces within @catalyst');
logger.info({
    authxServicePath,
    dataChannelRegistrarPath,
    authzedServicePath,
    jwtRegistryPath,
});

logger.info(`Setting up vite tests for the gateway...`);
export default defineWorkersConfig({
    test: {
        maxConcurrency: 1,
        globalSetup: './global-setup.ts',
        poolOptions: {
            workers: {
                main: 'src/index.ts',
                singleWorker: true,
                isolatedStorage: false,
                wrangler: { configPath: './wrangler.jsonc' },
                miniflare: {
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
                    workers: [
                        {
                            name: 'authx_token_api',
                            modules: true,
                            modulesRoot: path.resolve('../authx_token_api'),
                            scriptPath: authxServicePath,
                            compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                            compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                            unsafeEphemeralDurableObjects: true,
                            durableObjects: {
                                KEY_PROVIDER: 'JWTKeyProvider',
                            },
                            serviceBindings: {
                                DATA_CHANNEL_REGISTRAR: 'data_channel_registrar',
                                ISSUED_JWT_REGISTRY: 'issued-jwt-registry',
                                AUTHZED: 'authx_authzed_api',
                                USERCACHE: 'mock-usercache',
                            },
                        },
                        {
                            name: 'data_channel_registrar',
                            modules: true,
                            modulesRoot: path.resolve('../data_channel_registrar'),
                            scriptPath: dataChannelRegistrarPath,
                            compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                            compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                            entrypoint: 'RegistrarWorker',
                            unsafeEphemeralDurableObjects: true,
                            durableObjects: {
                                DO: 'Registrar',
                            },
                            serviceBindings: {
                                AUTHX_TOKEN_API: 'authx_token_api',
                                AUTHZED: 'authx_authzed_api',
                            },
                        },
                        {
                            name: 'authx_authzed_api',
                            modules: true,
                            modulesRoot: path.resolve('../authx_authzed_api'),
                            scriptPath: authzedServicePath,
                            compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                            compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                            bindings: {
                                AUTHZED_ENDPOINT: 'http://localhost:8449',
                                AUTHZED_KEY: 'atoken',
                                AUTHZED_PREFIX: 'orbisops_catalyst_dev/',
                            },
                        },
                        {
                            name: 'issued-jwt-registry',
                            modules: true,
                            modulesRoot: path.resolve('../issued-jwt-registry'),
                            scriptPath: jwtRegistryPath,
                            compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                            compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                            unsafeEphemeralDurableObjects: true,
                            durableObjects: {
                                ISSUED_JWT_REGISTRY_DO: 'I_JWT_Registry_DO',
                            },
                        },
                        {
                            name: 'mock-usercache',
                            modules: true,
                            scriptPath: path.resolve('./tests/__mocks__/usercache.js'),
                            compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                            compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                        },
                    ],
                },
            },
        },
        coverage: {
            provider: 'istanbul',
            reporter: ['text', 'html', 'json-summary', 'lcov'],
            reportsDirectory: './coverage',
            include: ['src/**/*.{ts,js}'],
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/test/**',
                '**/tests/**',
                '**/*.{test,spec}.?(c|m)[jt]s?(x)',
                '**/wrangler.jsonc',
                '**/wrangler.toml',
                '**/vitest.config.*',
                '**/.wrangler/**',
                '**/env.d.ts',
                '**/global-setup.ts',
                '**/global-teardown.ts',
            ],
        },
    },
});
