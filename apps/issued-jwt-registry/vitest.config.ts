// @ts-ignore
import {defineWorkersProject, readD1Migrations} from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";
import {Logger} from "tslog";

const logger = new Logger({});

const authxServicePath = path.resolve("../authx_token_api/dist/index.js");
const dataChannelRegistrarPath = path.resolve("../data_channel_registrar/dist/worker.js");
const authzedServicePath = path.resolve("../authx_authzed_api/dist/index.js")

logger.info('No external services used in this project from other workspaces within @catalyst');

logger.info(`Setting up vite tests for the issued-jwt durable object...`)
export default defineWorkersProject(async () => {

	return {
		customLogger: {
			...logger,
			warnOnce(msg: unknown, opts: any) {
				logger.warn(msg);
			},
		},
		optimizeDeps: {
			entries: ['@graphql-tools/executor-http'],
		},
		logLevel: 'info',
		clearScreen: false,
		test: {
			singleWorker: true,
			poolOptions: {
				workers: {
					main: "src/index.ts",
					wrangler: {configPath: "./wrangler.toml"},
					miniflare: {
						unsafeEphemeralDurableObjects: true,


						workers: [
							// Configuration for "auxiliary" Worker dependencies.
							// Unfortunately, auxiliary Workers cannot load their configuration
							// from `wrangler.toml` files, and must be configured with Miniflare
							// `WorkerOptions`.
							// {
							//
							// 	name: "authx_token_api",
							// 	modules: true,
							// 	modulesRoot: path.resolve("../authx_token_api"),
							// 	scriptPath: authxServicePath, // Built by `global-setup.ts`
							// 	entrypoint: "JWTWorker",
							// 	compatibilityDate: "2024-04-05",
							// 	compatibilityFlags: ["nodejs_compat"],
							// 	unsafeEphemeralDurableObjects: true,
							// 	durableObjects: {
							// 		"HSM": "HSM"
							// 	},
							// },
						],
					},
				},
			},
		},
	}
});
