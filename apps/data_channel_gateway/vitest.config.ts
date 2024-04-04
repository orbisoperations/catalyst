import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";


const authxServicePath = path.resolve("../authx_token_api/dist/index.js");
const dataChannelRegistrarPath = path.resolve("../data_channel_registrar/dist/worker.js");

console.log('Using services');
console.log({
  authxServicePath,
  dataChannelRegistrarPath,
})

export default defineWorkersConfig({
  test: {

    poolOptions: {
      workers: {
        main: "src/index.ts",
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          // modulesRoot: path.resolve("."),

          // bindings: {
          //   TEST_AUTH_PUBLIC_KEY: authKeypair.publicKey,
          // },

          workers: [
            // Configuration for "auxiliary" Worker dependencies.
            // Unfortunately, auxiliary Workers cannot load their configuration
            // from `wrangler.toml` files, and must be configured with Miniflare
            // `WorkerOptions`.
            // {
            //   name: "authx_token_api",
            //   modules: true,
            //   modulesRoot: path.resolve("../authx_token_api"),
            //   scriptPath: authxServicePath, // Built by `global-setup.ts`
            //   compatibilityDate: "2024-01-01",
            //   compatibilityFlags: ["nodejs_compat"],
            //   // kvNamespaces: ["KV_NAMESPACE"],
            // },
            {
              name: "data_channel_registrar",
              modules: true,
              modulesRoot: path.resolve("../data_channel_registrar"),
              scriptPath: dataChannelRegistrarPath, // Built by `global-setup.ts`
              compatibilityDate: "2024-01-01",
              compatibilityFlags: ["nodejs_compat"],
            },
          ],
        },
      },
    },
  },
});