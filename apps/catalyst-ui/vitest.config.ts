
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';
import { Logger } from 'tslog';

const logger = new Logger({});

const issuedJWTRegistryServicePath = path.resolve("../issued-jwt-registry/dist/index.js");

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
					singleWorker: true,
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
							}
						]
					}
				}
			}
		}
	}
});
