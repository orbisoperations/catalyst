import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { buildSchema } from 'drizzle-graphql';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { createYoga } from 'graphql-yoga';
import { GraphQLFieldConfig, type GraphQLFieldConfigMap, GraphQLObjectType, GraphQLSchema } from 'graphql';
import * as schema from './schema';

// -----------------------------------------------------------------------------
// Helper utilities
// -----------------------------------------------------------------------------

const ALLOWED_UPDATE_FIELDS = ['status', 'resultBucket', 'dataChannelId', 'parameters'] as const;

function isInsert(mutationName: string) {
    return mutationName.startsWith('insert');
}

function isUpdate(mutationName: string) {
    return mutationName.startsWith('update');
}

function isDelete(mutationName: string) {
    return mutationName.startsWith('delete');
}

function validateUpdateFields(mutationName: string, args: Record<string, unknown>) {
    if (!isUpdate(mutationName) || !mutationName.includes('Jobs')) return;

    const values = args?.values ?? {};
    const disallowed = Object.keys(values).filter((k) => !ALLOWED_UPDATE_FIELDS.includes(k as never));

    if (disallowed.length > 0) {
        throw new Error(
            `Updates to fields [${disallowed.join(', ')}] are not permitted. Allowed fields: ${ALLOWED_UPDATE_FIELDS.join(', ')}`
        );
    }
}

function extractJobId(source: Record<string, unknown>): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySrc = source as any;
    return anySrc.jobId ?? anySrc.job_id ?? anySrc.id;
}

async function enqueueJob(ctx: Env | undefined, jobId: string | undefined) {
    if (jobId && ctx?.JOB_QUEUE) {
        try {
            await ctx.JOB_QUEUE.send(JSON.stringify({ jobId }));
        } catch (err) {
            console.error('Failed to enqueue job', err);
        }
    }
}

/* ---------------------------------------------------------
 * Hook runners
 * -------------------------------------------------------*/

function runPreHook(mutationName: string, args: Record<string, unknown>, ctx?: Env) {
    if (isInsert(mutationName)) {
        console.log(`Executing pre-insert hook for ${mutationName}`);
        enqueueJob(ctx, extractJobId(args?.values as Record<string, unknown>));
    } else if (isUpdate(mutationName)) {
        console.log(`Executing pre-update hook for ${mutationName}`);
    } else if (isDelete(mutationName)) {
        console.log(`Executing pre-delete hook for ${mutationName}`);
    }
}

function runPostHook(mutationName: string, result: unknown, args: Record<string, unknown>, ctx?: Env) {
    if (isInsert(mutationName)) {
        console.log(`Executing post-insert hook for ${mutationName}`);

        // Drizzle-GraphQL returns created record(s). Handle both array and object shapes.
        const insertedRecord = Array.isArray(result)
            ? (result as Record<string, unknown>[])[0]
            : (result as Record<string, unknown>);

        // Prefer jobId from result, fall back to args
        const jobId = extractJobId(insertedRecord) || extractJobId(args?.values as Record<string, unknown>);
        enqueueJob(ctx, jobId);
    } else if (isUpdate(mutationName)) {
        console.log(`Executing post-update hook for ${mutationName}`);
    } else if (isDelete(mutationName)) {
        console.log(`Executing post-delete hook for ${mutationName}`);
    }
}

// -----------------------------------------------------------------------------
// Mutation wrapper factory
// -----------------------------------------------------------------------------

function wrapMutationResolver(
    mutationName: string,
    mutation: GraphQLFieldConfig<unknown, unknown>
): GraphQLFieldConfig<unknown, unknown> {
    const originalResolver = mutation.resolve;

    if (!originalResolver) return mutation;

    return {
        ...mutation,
        resolve: async (
            ...resolverArgs: Parameters<Exclude<typeof originalResolver, undefined>>
        ): Promise<ReturnType<Exclude<typeof originalResolver, undefined>>> => {
            const [, args, ctx] = resolverArgs as [unknown, Record<string, unknown>, Env, unknown];

            // ---------------------- PRE-RESOLVE -----------------------------
            validateUpdateFields(mutationName, args);
            runPreHook(mutationName, args, ctx);

            let result: Awaited<ReturnType<typeof originalResolver>>;
            try {
                // ---------------------- RESOLVE -------------------------------
                result = await originalResolver(...(resolverArgs as Parameters<typeof originalResolver>));
                return result;
            } finally {
                // ---------------------- POST-RESOLVE (always) --------------------------
                // Even if the resolver throws, we still execute post hooks for logging/cleanup
                // Pass along whatever result we obtained (may be undefined)
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore – result may be undefined if resolver threw
                runPostHook(mutationName, result, args, ctx);
            }
        },
    };
}

// -----------------------------------------------------------------------------
// GraphQL Server Factory
// -----------------------------------------------------------------------------

export function createGraphQLServer(db: DrizzleD1Database<typeof schema>) {
    const { entities } = buildSchema(db);

    // Build a new mutation map so we don't mutate the readonly map provided by drizzle-graphql.
    const wrappedMutations: GraphQLFieldConfigMap<unknown, unknown> = {};

    (Object.keys(entities.mutations) as (keyof typeof entities.mutations)[]).forEach((mutationName) => {
        wrappedMutations[mutationName] = wrapMutationResolver(mutationName, entities.mutations[mutationName]);
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
