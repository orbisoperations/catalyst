import { Hono } from 'hono';
import { createYoga } from 'graphql-yoga';
import schemaBuilder from './pothos/schemaBuilder';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
const app = new Hono();
app.use('/graphql', async (ctx) => {
    const db = new Kysely({
        dialect: new D1Dialect({ database: ctx.env.APP_DB }),
    });
    const yoga = createYoga({
        schema: schemaBuilder,
        graphqlEndpoint: '/graphql',
    });
    return yoga(ctx.req.raw, {
        db: db,
    });
});
export default app;
