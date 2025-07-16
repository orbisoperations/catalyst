import { defineMiniflareConfig } from '@miniflare/vitest-environment/config';

export default defineMiniflareConfig({
	// This will automatically use your `wrangler.toml` file to configure bindings,
	// services, and other resources.
});
