// @ts-ignore
import {defineWorkersProject, readD1Migrations} from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";


const userCache = path.resolve("../user_credentials_cache/dist/index.js")

console.info('No external services used in this project from other workspaces within @catalyst');

console.info(`Setting up vite tests for the issued-jwt durable object...`)
export default defineWorkersProject(async () => {

	return {
		esbuild: {
			target: "ES2022"
		},
		optimizeDeps: {
			entries: ['@graphql-tools/executor-http'],
		},
		logLevel: 'info',
		clearScreen: false,
		test: {
			globalSetup: './global-setup.ts',
			poolOptions: {
				workers: {
					singleWorker: true,
					wrangler: {configPath: "./wrangler.toml"},
					miniflare: {
						unsafeEphemeralDurableObjects: true,
						workers: [
							{
								name: "user_credentials_cache",
								modules: true,
								modulesRoot: path.resolve("../user_credentials_cache"),
								scriptPath: path.resolve("../user_credentials_cache/dist/index.js"),
								compatibilityDate: "2024-04-05",
								compatibilityFlags: ["nodejs_compat"],
								entrypoint: "UserCredsCacheWorker",
								unsafeEphemeralDurableObjects: true,
								durableObjects: {
									CACHE: "UserCredentialCache"
								}
							}
						],
					},
				},
			},
		},
	}
});
