
// @ts-ignore - this import is not actually broken...
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';
import { Logger } from 'tslog';

const logger = new Logger({});

const issuedJWTRegistryServicePath = path.resolve("../issued-jwt-registry/dist/index.js");
const organizationMatchmakingServicePath = path.resolve("../organization_matchmaking/dist/index.js");
const dataChannelRegistrarPath = path.resolve("../data_channel_registrar/dist/worker.js");
const authxServicePath = path.resolve("../authx_token_api/dist/index.js");
const authzedServicePath = path.resolve("../authx_authzed_api/dist/index.js")
const credsCacheServicePath = path.resolve("../user_credentials_cache/dist/index.js")



logger.info('Using built services from other workspaces within @catalyst');
logger.info(`Setting up vite tests for the Issued JWT Registry...`);

export default defineWorkersProject(async () =>{
	return {
		test: {
			maxConcurrency: 1,
			globalSetup: './global-setup.ts',
			poolOptions: {
				workers: {
					isolatedStorage: true,
					//singleWorker: true,
					wrangler: { configPath: './wrangler.toml' },
					miniflare: {
						compatibilityFlags: ['nodejs_compat'],
						workers: [
							{
								name: 'issued_jwt_registry',
								modules: true,
								compatibilityDate: "2024-04-05",
								modulesRoot: path.resolve("../issued-jwt-registry"),
								unsafeEphemeralDurableObjects: true,
								scriptPath: issuedJWTRegistryServicePath,
								durableObjects: {
									"ISSUED_JWT_REGISTRY_DO": "I_JWT_Registry_DO"
								}
							},
							{
								name: "data_channel_registrar",
								modules: true,
								modulesRoot: path.resolve("../data_channel_registrar"),
								scriptPath: dataChannelRegistrarPath, // Built by `global-setup.ts`
								compatibilityDate: "2024-04-05",
								compatibilityFlags: ["nodejs_compat"],
								entrypoint: "RegistrarWorker",
								unsafeEphemeralDurableObjects: true,
								durableObjects: {
								  "DO": "Registrar"
								}
							  },
							  {

								name: "authx_token_api",
								modules: true,
								modulesRoot: path.resolve("../authx_token_api"),
								scriptPath: authxServicePath, // Built by `global-setup.ts`
								entrypoint: "JWTWorker",
								compatibilityDate: "2024-04-05",
								compatibilityFlags: ["nodejs_compat"],
								unsafeEphemeralDurableObjects: true,
								durableObjects: {
								  "KEY_PROVIDER": "JWTKeyProvider"
								},
								// kvNamespaces: ["KV_NAMESPACE"],
							  },
							  {
								name: "authx_authzed_api",
								modules: true,
								modulesRoot: path.resolve("../authx_authzed_api"),
								scriptPath: authzedServicePath, // Built by `global-setup.ts`
								compatibilityDate: "2024-04-05",
								compatibilityFlags: ["nodejs_compat"],
								entrypoint: "AuthzedWorker",
								bindings: {
								  AUTHZED_ENDPOINT: "http://localhost:8081",
								  AUTHZED_KEY: "atoken",
								  AUTHZED_PREFIX: "orbisops_catalyst_dev/"
								},
								/*d1Databases: {
								  "APP_DB": "catalyst"
								},*/
							  },
							  {
								name: "user_credentials_cache",
								modules: true,
								modulesRoot: path.resolve("../user_credentials_cache"),
								scriptPath: credsCacheServicePath, // Built by `global-setup.ts`
								compatibilityDate: "2024-04-05",
								compatibilityFlags: ["nodejs_compat"],
								entrypoint: "UserCredsCacheWorker",
								durableObjects: {
									"CACHE": "UserCredsCache"
								}
							  }
						]
					}
				}
			}
		}
	}
});

/*\
durableObjects: {
							"ORG_MATCHMAKING": {
								scriptName: "organization-matchmaking",
								className: "OrganizationMatchmakingDO"
							}
						},
,{
								name: "organization-matchmaking",
								modules: true,
								compatibilityDate: "2024-04-05",
								modulesRoot: path.resolve("../organization_matchmaking"),
								unsafeEphemeralDurableObjects: true,
								scriptPath: organizationMatchmakingServicePath,
								durableObjects: {
									"ORG_MATCHMAKING": "OrganizationMatchmakingDO"
								}
							}
*/
