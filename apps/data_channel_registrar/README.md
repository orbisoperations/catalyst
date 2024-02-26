
# Catalyst
```
pnpm install
pnpm dev
```
## Local Dev D1 Migrations

We are using the [Prisma Plugin](https://pothos-graphql.dev/docs/plugins/prisma) with [Pothos](https://pothos-graphql.dev/) and [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate/workflows/team-development) for the management of our Cloudflare D1 instance. 

_***We are NOT using the wrangler migration tools.***_


### To generate a new migration:

1. Update the `apps/data_channel_registrar/prisma/schema.prisma` file with your new schema change
2. Execute `pnpm migrate` which will create a new migration file in `apps/data_channel_registrar/prisma/migrations`, but it will also apply the new migration to the local D1 sqlite instance
3. View your changes in the local sqlite db located `apps/data_channel_registrar/prisma/dev.db`
