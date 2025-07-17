import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/schema.ts',
    out: './drizzle',
    dialect: 'sqlite',
    driver: 'd1',
    dbCredentials: {
        wranglerConfigPath: 'wrangler.jsonc',
        dbName: 'jobs-db',
    },
});
