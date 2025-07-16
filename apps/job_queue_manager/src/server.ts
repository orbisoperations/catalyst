import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { buildSchema } from 'drizzle-graphql';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { createYoga } from 'graphql-yoga';
import { type GraphQLFieldConfigMap, GraphQLObjectType, GraphQLSchema } from 'graphql';
// Cloudflare Queue type
import type { Queue } from '@cloudflare/workers-types';
import * as schema from './schema';

export type Env = {
    DB: D1Database;
    /**
     * Queue used to fan-out newly submitted jobs to workers that will execute them.
     * Defined as `JOB_QUEUE` in `wrangler.toml`.
     */
    JOB_QUEUE: Queue;
};

export function createGraphQLServer(db: DrizzleD1Database<typeof schema>) {
    const { entities } = buildSchema(db);

    // Build a new mutation map so we don't mutate the (readonly) one provided by
    // drizzle-graphql.
    const wrappedMutations: GraphQLFieldConfigMap<unknown, unknown> = {};

    (Object.keys(entities.mutations) as (keyof typeof entities.mutations)[]).forEach((mutationName) => {
        const originalMutation = entities.mutations[mutationName];
        const originalResolver = originalMutation.resolve;

        if (!originalResolver) {
            // Mutations like simple field declarations (without resolve) are copied verbatim.
            wrappedMutations[mutationName] = originalMutation;
            return;
        }

        wrappedMutations[mutationName] = {
            ...originalMutation,
            resolve: async (
                ...resolverArgs: Parameters<typeof originalResolver>
            ): Promise<ReturnType<typeof originalResolver>> => {
                const [, args, ctx] = resolverArgs as [unknown, Record<string, unknown>, Env, unknown];

                // Restrict update mutations to only specific fields
                if (mutationName.startsWith('update') && mutationName.includes('Jobs')) {
                    const allowedFields = ['status', 'resultBucket', 'dataChannelId', 'parameters'];
                    const values = args?.values ?? {};
                    const disallowed = Object.keys(values).filter((k) => !allowedFields.includes(k));
                    if (disallowed.length > 0) {
                        throw new Error(
                            `Updates to fields [${disallowed.join(', ')}] are not permitted. Allowed fields: ${allowedFields.join(', ')}`
                        );
                    }
                }

                if (mutationName.startsWith('insert')) {
                    console.log(`Executing pre-insert hook for ${mutationName}`);
                    // Attempt to enqueue immediately based on args when available
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const preVals = (args as any)?.values ?? {};
                    const preJobId: string | undefined = preVals.jobId ?? preVals.job_id;
                    if (preJobId && ctx?.JOB_QUEUE) {
                        ctx.JOB_QUEUE.send(JSON.stringify({ jobId: preJobId })).catch(() => {});
                    }
                } else if (mutationName.startsWith('update')) {
                    console.log(`Executing pre-update hook for ${mutationName}`);
                } else if (mutationName.startsWith('delete')) {
                    console.log(`Executing pre-delete hook for ${mutationName}`);
                }

                let result: Awaited<ReturnType<typeof originalResolver>>;
                try {
                    // @ts-expect-error TS cannot yet infer the spread of generic tuple
                    result = await originalResolver(...resolverArgs);

                    // After a successful insert into jobs, enqueue the jobId so that
                    // downstream workers can start processing it.
                    if (mutationName.startsWith('insert')) {
                        // Drizzle-GraphQL returns created record(s). Handle both array and object shapes.
                        const insertedRecord = Array.isArray(result)
                            ? (result as Record<string, unknown>[])[0]
                            : (result as Record<string, unknown>);

                        const recAny = insertedRecord as Record<string, unknown>;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        let jobId = (recAny as any).jobId ?? (recAny as any).id;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const argVals = (args as any)?.values ?? {};
                        if (!jobId && typeof argVals.jobId === 'string') {
                            jobId = argVals.jobId;
                        }
                        if (!jobId && typeof argVals.job_id === 'string') {
                            jobId = argVals.job_id;
                        }
                        if (jobId && ctx?.JOB_QUEUE) {
                            ctx.JOB_QUEUE.send(JSON.stringify({ jobId })).catch((err) => {
                                console.error('Failed to enqueue job', err);
                            });
                        }
                    }
                } finally {
                    // Ensure post hooks are executed even if the resolver throws so that
                    // application-level error handling can still rely on side-effects
                    // like logging or metrics.
                    if (mutationName.startsWith('insert')) {
                        console.log(`Executing post-insert hook for ${mutationName}`);
                    } else if (mutationName.startsWith('update')) {
                        console.log(`Executing post-update hook for ${mutationName}`);
                    } else if (mutationName.startsWith('delete')) {
                        console.log(`Executing post-delete hook for ${mutationName}`);
                    }
                }

                return result!;
            },
        };
    });

    const gqlSchema = new GraphQLSchema({
        query: new GraphQLObjectType({
            name: 'Query',
            fields: entities.queries,
        }),
        mutation: new GraphQLObjectType({
            name: 'Mutation',
            fields: wrappedMutations,
        }),
        types: [...Object.values(entities.types), ...Object.values(entities.inputs)],
    });

    const yoga = createYoga<Env>({
        schema: gqlSchema,
        graphqlEndpoint: '/graphql',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context: (initial: any) => initial.serverContext as Env,
    });

    return yoga;
}

const app = new Hono<{ Bindings: Env }>();

app.use('/graphql/*', async (c) => {
    const db = drizzle(c.env.DB, { schema });
    const server = createGraphQLServer(db);
    return server(c.req.raw, c.env);
});

export default app;
