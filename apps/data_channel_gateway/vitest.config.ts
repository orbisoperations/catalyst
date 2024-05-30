// @ts-ignore
import {defineWorkersProject, readD1Migrations} from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";
import {Logger} from "tslog";
import {env} from "cloudflare:test";
import { JWT } from "@catalyst/authx_token_api/src/jwt";

const logger = new Logger({});

const authxServicePath = path.resolve("../authx_token_api/dist/index.js");
const dataChannelRegistrarPath = path.resolve("../data_channel_registrar/dist/worker.js");
const authzedServicePath = path.resolve("../authx_authzed_api/dist/index.js")
const jwtRegistryPath = path.resolve("../issued-jwt-registry/dist/index.js")


logger.info('Using built services from other workspaces within @catalyst');
logger.info({
  authxServicePath,
  dataChannelRegistrarPath,
  authzedServicePath,
  jwtRegistryPath
})

// Setup files run outside isolated storage, and may be run multiple times.
// `applyD1Migrations()` only applies migrations that haven't already been
// applied, therefore it is safe to call this function here.
logger.info(`Setting up vite tests for the gateway...`)
export default defineWorkersProject(async () => {

  /*
  // Read all migrations in the `migrations` directory
  const appMigrationsPath = path.join(__dirname, "../../packages/schema/dist/flat_migrations");
  const seedMigrationsPath = path.join(__dirname, "./scripts/seed");
  const appMigrations = await readD1Migrations(appMigrationsPath);
  const seedMigrations = await readD1Migrations(seedMigrationsPath);

  logger.info({appMigrations, seedMigrations})
  */

  // const migrations = await readD1Migrations(appMigrationsPath);

  return {
    customLogger: {
      ...logger,
      warnOnce(msg, opts) {
        logger.warn(msg);
      },
    },
    optimizeDeps: {
      entries: ['@graphql-tools/executor-http'],
    },
    logLevel: 'info',
    clearScreen: false,
    test: {
      maxConcurrency: 1,
      globalSetup: './global-setup.ts',
      //setupFiles: ["./tests/apply-migrations.ts"],
      singleWorker: true,
      poolOptions: {
        singleWorker: true,
        workers: {
          main: "src/index.ts",
          wrangler: {configPath: "./wrangler.toml"},
          miniflare: {
            unsafeEphemeralDurableObjects: true,
            durableObjects: {
              DATA_CHANNEL_REGISTRAR_DO: {
                className: "Registrar",
                scriptName: "data_channel_registrar"
              },
              JWT_TOKEN_DO: {
                className: "JWTKeyProvider",
                scriptName: "authx_token_api"
              },
              JWT_REGISTRY_DO: {
                className: "I_JWT_Registry_DO",
                scriptName: "issued_jwt_registry"
              }
            },
            /*d1Databases: {
              "APP_DB": "catalyst"
            },
            bindings: {APP_MIGRATIONS: [...appMigrations, ...seedMigrations]},*/
            // modulesRoot: path.resolve("."),

            // bindings: {
            //   TEST_AUTH_PUBLIC_KEY: authKeypair.publicKey,
            // },

            workers: [
              // Configuration for "auxiliary" Worker dependencies.
              // Unfortunately, auxiliary Workers cannot load their configuration
              // from `wrangler.toml` files, and must be configured with Miniflare
              // `WorkerOptions`.
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
                /*d1Databases: {
                  "APP_DB": "catalyst"
                },*/
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
                name: "issued_jwt_registry",
                modules: true,
                modulesRoot: path.resolve("../issued-jwt-registry"),
                script: jwtRegistryPath, // Built by `global-setup.ts`
                compatibilityDate: "2024-04-05",
                compatibilityFlags: ["nodejs_compat"],
                entrypoint: "IssuedJWTRegistryWorker",
                unsafeEphemeralDurableObjects: true,
                durableObjects: {
                  ISSUED_JWT_REGISTRY_DO: "I_JWT_Registry_DO"
                }
              },
              {
                name: "user_credentials_cache",
                modules: true,
                modulesRoot: path.resolve("../user_credentials_cache"),
                script: path.resolve("../user_credentials_cache/dist/index.js"), // Built by `global-setup.ts`
                compatibilityDate: "2024-04-05",
                compatibilityFlags: ["nodejs_compat"],
                entrypoint: "UserCredsCacheWorker",
                unsafeEphemeralDurableObjects: true,
                durableObjects: {
                  CACHE: "UserCredsCache"
                }
              }
            ],
          },
        },
      },
    },
  }
});

// export default defineWorkersConfig({
//   test: {
//
//     poolOptions: {
//       workers: {
//         main: "src/index.ts",
//         wrangler: { configPath: "./wrangler.toml" },
//         miniflare: {
//           d1Databases: {
//             "REGISTRAR_DB": "catalyst"
//           },
//           // modulesRoot: path.resolve("."),
//
//           // bindings: {
//           //   TEST_AUTH_PUBLIC_KEY: authKeypair.publicKey,
//           // },
//
//           workers: [
//             // Configuration for "auxiliary" Worker dependencies.
//             // Unfortunately, auxiliary Workers cannot load their configuration
//             // from `wrangler.toml` files, and must be configured with Miniflare
//             // `WorkerOptions`.
//             {
//               name: "authx_token_api",
//               modules: true,
//               modulesRoot: path.resolve("../authx_token_api"),
//               scriptPath: authxServicePath, // Built by `global-setup.ts`
//               compatibilityDate: "2024-01-01",
//               compatibilityFlags: ["nodejs_compat"],
//               // unsafeEphemeralDurableObjects: true,
//               durableObjects: {
//                 "HSM": "HSM"
//               },
//               // kvNamespaces: ["KV_NAMESPACE"],
//             },
//             {
//               name: "data_channel_registrar",
//               modules: true,
//               modulesRoot: path.resolve("../data_channel_registrar"),
//               scriptPath: dataChannelRegistrarPath, // Built by `global-setup.ts`
//               compatibilityDate: "2024-01-01",
//               compatibilityFlags: ["nodejs_compat"],
//               d1Databases: {
//                 "APP_DB": "catalyst"
//               },
//
//             },
//           ],
//         },
//       },
//     },
//   },
// });