import { applyD1Migrations, env } from "cloudflare:test";

// console.log(`INFO: Applying ${env.TEST_SEED_MIGRATIONS.length} schema migrations:`)

await applyD1Migrations(env.APP_DB, env.APP_MIGRATIONS);

// console.log(`INFO: Applying ${env.TEST_SEED_MIGRATIONS.length} seed data migrations:`)
// await applyD1Migrations(env.APP_DB, env.TEST_SEED_MIGRATIONS);