/*import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
  },
});*/

import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    exclude: [],
  },
})
