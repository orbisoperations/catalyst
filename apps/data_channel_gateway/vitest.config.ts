import {defineWorkersConfig, defineWorkersProject, readD1Migrations} from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";

const authxServicePath = path.resolve("../authx_token_api/dist/index.js");
const dataChannelRegistrarPath = path.resolve("../data_channel_registrar/dist/worker.js");

console.log('Using services');
console.log({
  authxServicePath,
  dataChannelRegistrarPath,
})


export default defineWorkersProject(async () => {

  // Read all migrations in the `migrations` directory
  const migrationsPath = path.join(__dirname, "../../packages/schema/dist/flat_migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    optimizeDeps: {
      entries: ['@graphql-tools/executor-http'],
    },
    test: {
      globalSetup: './global-setup.ts',
      setupFiles: ["./tests/apply-migrations.ts"],

      poolOptions: {
        workers: {
          main: "src/index.ts",
          wrangler: { configPath: "./wrangler.toml" },
          miniflare: {
            d1Databases: {
              "APP_DB": "catalyst"
            },
            bindings: { TEST_MIGRATIONS: migrations },
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
                compatibilityDate: "2024-01-01",
                compatibilityFlags: ["nodejs_compat"],
                // unsafeEphemeralDurableObjects: true,
                durableObjects: {
                  "HSM": "HSM"
                },
                // kvNamespaces: ["KV_NAMESPACE"],
              },
              {
                name: "data_channel_registrar",
                modules: true,
                modulesRoot: path.resolve("../data_channel_registrar"),
                scriptPath: dataChannelRegistrarPath, // Built by `global-setup.ts`
                compatibilityDate: "2024-01-01",
                compatibilityFlags: ["nodejs_compat"],
                d1Databases: {
                  "APP_DB": "catalyst"
                },
              },
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