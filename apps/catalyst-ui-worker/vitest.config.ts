import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';
import { Logger } from 'tslog';
// Standardized test configuration values
const STANDARD_COMPATIBILITY_DATE = '2025-04-01';
const STANDARD_COMPATIBILITY_FLAGS = ['nodejs_compat'];

const logger = new Logger({});

const issuedJWTRegistryServicePath = path.resolve('../issued-jwt-registry/dist/index.js');
const organizationMatchmakingServicePath = path.resolve('../organization_matchmaking/dist/index.js');
const dataChannelRegistrarPath = path.resolve('../data_channel_registrar/dist/worker.js');
const authxServicePath = path.resolve('../authx_token_api/dist/index.js');
const authzedServicePath = path.resolve('../authx_authzed_api/dist/index.js');
const credsCacheServicePath = path.resolve('../user-credentials-cache/dist/index.js');

logger.info('Using built services from other workspaces within @catalyst');
logger.info(`Setting up vite tests for the Issued JWT Registry...`);

export default defineWorkersProject(async () => {
    return {
        test: {
            maxConcurrency: 1,
            globalSetup: './global-setup.ts',
            poolOptions: {
                workers: {
                    isolatedStorage: true,
                    //singleWorker: true,
                    wrangler: { configPath: './wrangler.jsonc' },
                    miniflare: {
                        durableObjects: {
                            ORG_MATCHMAKING: {
                                scriptName: 'organization-matchmaking',
                                className: 'OrganizationMatchmakingDO',
                            },
                        },
                        compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                        compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                        workers: [
                            {
                                name: 'issued_jwt_registry',
                                modules: true,
                                compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                                compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                                modulesRoot: path.resolve('../issued-jwt-registry'),
                                unsafeEphemeralDurableObjects: true,
                                scriptPath: issuedJWTRegistryServicePath,
                                durableObjects: {
                                    ISSUED_JWT_REGISTRY_DO: 'I_JWT_Registry_DO',
                                } as Record<string, string>,
                            },
                            {
                                name: 'data_channel_registrar',
                                modules: true,
                                modulesRoot: path.resolve('../data_channel_registrar'),
                                scriptPath: dataChannelRegistrarPath, // Built by `global-setup.ts`
                                compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                                compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                                entrypoint: 'RegistrarWorker',
                                unsafeEphemeralDurableObjects: true,
                                durableObjects: {
                                    DO: 'Registrar',
                                } as Record<string, string>,
                            },
                            {
                                name: 'authx_token_api',
                                modules: true,
                                modulesRoot: path.resolve('../authx_token_api'),
                                scriptPath: authxServicePath, // Built by `global-setup.ts`
                                entrypoint: 'JWTWorker',
                                compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                                compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                                unsafeEphemeralDurableObjects: true,
                                durableObjects: {
                                    KEY_PROVIDER: 'JWTKeyProvider',
                                } as Record<string, string>,
                                // kvNamespaces: ["KV_NAMESPACE"],
                            },
                            {
                                name: 'authx_authzed_api',
                                modules: true,
                                modulesRoot: path.resolve('../authx_authzed_api'),
                                scriptPath: authzedServicePath, // Built by `global-setup.ts`
                                compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                                compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                                entrypoint: 'AuthzedWorker',
                                bindings: {
                                    AUTHZED_ENDPOINT: 'http://localhost:8449',
                                    AUTHZED_KEY: 'atoken',
                                    AUTHZED_PREFIX: 'orbisops_catalyst_dev/',
                                },
                                /*d1Databases: {
								  "APP_DB": "catalyst"
								},*/
                            },
                            {
                                name: 'user-credentials-cache',
                                modules: true,
                                modulesRoot: path.resolve('../user-credentials-cache'),
                                scriptPath: credsCacheServicePath, // Built by `global-setup.ts`
                                compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                                compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                                entrypoint: 'UserCredsCacheWorker',
                                durableObjects: {
                                    CACHE: 'UserCredsCache',
                                },
                            },
                            {
                                name: 'organization-matchmaking',
                                modules: true,
                                compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                                compatibilityFlags: STANDARD_COMPATIBILITY_FLAGS,
                                modulesRoot: path.resolve('../organization_matchmaking'),
                                unsafeEphemeralDurableObjects: true,
                                scriptPath: organizationMatchmakingServicePath,
                                durableObjects: {
                                    ORG_MATCHMAKING: 'OrganizationMatchmakingDO',
                                },
                            },
                        ],
                    },
                },
            },
        },
    };
});

/*\

,
*/
