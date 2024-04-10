import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  logLevel: "info",
  test: {
    poolOptions: {
      workers: {
        wrangler: {
					configPath: "./wrangler.toml",
				},
				singleWorker: true,
				miniflare: {
					compatibilityFlags: ["nodejs_compat"],
					bindings: {
						AUTHZED_ENDPOINT: "http://localhost:8081",
						AUTHZED_KEY: "atoken",
						AUTHZED_PREFIX: "orbisops_catalyst_dev/"
					},
				}
      },
    },
  },
});
