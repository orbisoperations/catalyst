// @ts-ignore
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';
import { Logger } from 'tslog';

const logger = new Logger({});

const authxServicePath = path.resolve('../authx_token_api/dist/index.js');
const dataChannelRegistrarPath = path.resolve(
    '../data_channel_registrar/dist/worker.js'
);
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
export default defineWorkersProject({
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
                    workers: [
                        {
                            name: 'authx_token_api',
                            modules: true,
                            modulesRoot: path.resolve('../authx_token_api'),
                            scriptPath: authxServicePath,
                            compatibilityDate: '2025-04-01',
                            compatibilityFlags: ['nodejs_compat'],
                            unsafeEphemeralDurableObjects: true,
                            durableObjects: {
                                KEY_PROVIDER: 'JWTKeyProvider',
                            },
                        },
                        {
                            name: 'data_channel_registrar',
                            modules: true,
                            modulesRoot: path.resolve(
                                '../data_channel_registrar'
                            ),
                            scriptPath: dataChannelRegistrarPath,
                            compatibilityDate: '2025-04-01',
                            compatibilityFlags: ['nodejs_compat'],
                            entrypoint: 'RegistrarWorker',
                            unsafeEphemeralDurableObjects: true,
                            durableObjects: {
                                DO: 'Registrar',
                            },
                            serviceBindings: {
                                AUTHX_TOKEN_API: 'authx_token_api',
                                AUTHZED: 'authx_authzed_api'
                            },
                        },
                        {
                            name: 'authx_authzed_api',
                            modules: true,
                            modulesRoot: path.resolve('../authx_authzed_api'),
                            scriptPath: authzedServicePath,
                            compatibilityDate: '2025-04-01',
                            compatibilityFlags: ['nodejs_compat'],
                            bindings: {
                                AUTHZED_ENDPOINT: 'http://localhost:8443',
                                AUTHZED_KEY: 'atoken',
                                AUTHZED_PREFIX: 'orbisops_catalyst_dev/',
                            },
                        },
                        {
                            name: 'issued-jwt-registry',
                            modules: true,
                            modulesRoot: path.resolve('../issued-jwt-registry'),
                            scriptPath: jwtRegistryPath,
                            compatibilityDate: '2025-04-01',
                            compatibilityFlags: ['nodejs_compat'],
                            unsafeEphemeralDurableObjects: true,
                            durableObjects: {
                                ISSUED_JWT_REGISTRY_DO: 'I_JWT_Registry_DO',
                            },
                        },
                    ],
                },
            },
        },
    },
});
