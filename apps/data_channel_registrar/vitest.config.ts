// @ts-ignore
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';
// @ts-ignore esmoduleInterop not allowing this to be resolved by the ide compiler
import { Logger } from 'tslog';

const logger = new Logger({});

logger.info('Using built services from other workspaces within @catalyst');
logger.info('no external services used in this project');

// Setup files run outside isolated storage, and may be run multiple times.

logger.info(`Setting up vite tests for the Data Channel Registrar...`);
export default defineWorkersProject(async () => {
  return {
    optimizeDeps: {
      entries: ['@graphql-tools/executor-http'],
    },
    logLevel: 'info',
    clearScreen: false,
    test: {
      poolOptions: {
        workers: {
          isolatedStorage: true,
          singleWorker: true,
          main: 'src/worker.ts',
          wrangler: { configPath: './wrangler.toml' },
          entrypoint: 'RegistrarWorker',
          miniflare: {
            compatibilityDate: '2025-04-01',
            compatibilityFlags: ['nodejs_compat'],
          },
        },
      },
    },
  };
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
