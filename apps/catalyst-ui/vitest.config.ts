
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
					main: 'src/index.ts',
					wrangler: { configPath: './wrangler.toml' },
					miniflare: {
						compatibilityDate: '2024-04-05',
						compatibilityFlags: ['nodejs_compat'],
						serviceBindings: {
							ISSUED_JWT_REGISTRY_WORKER: "issued_jwt_registry"
						},
						workers: [
							// Configuration for "auxiliary" Worker dependencies.
							// Unfortunately, auxiliary Workers cannot load their configuration
							// from `wrangler.toml` files, and must be configured with Miniflare
							// `WorkerOptions`.
							{
								name: 'issued_jwt_registry',
								modules: true,
								modulesRoot: path.resolve("../issued-jwt-registry"),
								scriptPath: issuedJWTRegistryServicePath, // Built by `global-setup.ts`
								compatibilityDate: '2024-04-05',
								compatibilityFlags: ['nodejs_compat'],
								durableObjects: {
									"ISSUED_JWT_REGISTRY_DO": "ISSUED_JWT_REGISTRY_DO"
								}
							}
						]
					}
				}
			}
		}
	}
	});
