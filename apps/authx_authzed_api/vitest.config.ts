import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  logLevel: "info",
  test: {
    poolOptions: {
      workers: {
        wrangler: {
			configPath: "./wrangler.toml",
		},
	  miniflare: {
		bindings: {
			AUTHZED_ENDPOINT: "localhost:50051",
			AUTHZED_KEY: "atoken",
			AUTHZED_PREFIX: "orbisops_catalyst_dev/"
		}
	  }
      },
    },
  },
});
