
import { defineWorkersProject } from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";
import {Logger} from "tslog";

const logger = new Logger({});

const authxServicePath = path.resolve("../authx_token_api/dist/index.js");
const dataChannelRegistrarPath = path.resolve("../data_channel_registrar/dist/worker.js");
const authzedServicePath = path.resolve("../authx_authzed_api/dist/index.js")

logger.info('Using built services from other workspaces within @catalyst');
logger.info({
  authxServicePath,
  dataChannelRegistrarPath,
  authzedServicePath
})


logger.info(`Setting up vite tests for the gateway...`)
export default defineWorkersProject(async () => {

  return {
    test: {
      maxConcurrency: 1,
      globalSetup: './global-setup.ts',
      poolOptions: {
        workers: {
          isolatedStorage: true,
          wrangler: {configPath: "./wrangler.toml"},
          miniflare: {
            durableObjects: {
              DATA_CHANNEL_REGISTRAR_DO: {
                className: "Registrar",
                scriptName: "data_channel_registrar"
              },
              JWT_TOKEN_DO: {
                className: "JWTKeyProvider",
                scriptName: "authx_token_api"
              }
            },
            compatibilityFlags: ["nodejs_compat"],
            workers: [
              {
                name: "authx_token_api",
                modules: true,
                compatibilityDate: "2024-04-05",
                modulesRoot: path.resolve("../authx_token_api"),
                unsafeEphemeralDurableObjects: true,
                scriptPath: authxServicePath, // Built by `global-setup.ts`
                durableObjects: {
                  KEY_PROVIDER: "JWTKeyProvider"
                } as Record<string,string>,
              },
              {
                name: "data_channel_registrar",
                modules: true,
                compatibilityDate: "2024-04-05",
                modulesRoot: path.resolve("../data_channel_registrar"),
                unsafeEphemeralDurableObjects: true,
                scriptPath: dataChannelRegistrarPath, // Built by `global-setup.ts`
                durableObjects: {
                  DO: "Registrar",
                } as Record<string,string>
              },
              {
                name: "authx_authzed_api",
                modules: true,
                compatibilityDate: "2024-04-05",
                modulesRoot: path.resolve("../authx_authzed_api"),
                unsafeEphemeralDurableObjects: true,
                scriptPath: authzedServicePath, // Built by `global-setup.ts`
                bindings: {
                  AUTHZED_ENDPOINT: "http://localhost:8081",
                  AUTHZED_KEY: "atoken",
                  AUTHZED_PREFIX: "orbisops_catalyst_dev/"
                },
              }
            ],
          },
        },
      },
    },
  }
});
