import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { buildSchema } from 'drizzle-graphql';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { createYoga } from 'graphql-yoga';
import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import * as schema from './schema';

export type Env = {
  DB: D1Database;
};

export function createGraphQLServer(db: DrizzleD1Database<typeof schema>) {
  const { entities } = buildSchema(db);

  // Build a new mutation map so we don't mutate the (readonly) one provided by
  // drizzle-graphql.
  const wrappedMutations: Record<
    keyof typeof entities.mutations,
    (typeof entities.mutations)[keyof typeof entities.mutations]
  > = {} as any;

  (Object.keys(entities.mutations) as (keyof typeof entities.mutations)[]).forEach(
    (mutationName) => {
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
          if (mutationName.startsWith('insert')) {
            console.log(`Executing pre-insert hook for ${mutationName}`);
          } else if (mutationName.startsWith('update')) {
            console.log(`Executing pre-update hook for ${mutationName}`);
          } else if (mutationName.startsWith('delete')) {
            console.log(`Executing pre-delete hook for ${mutationName}`);
          }

          let result: Awaited<ReturnType<typeof originalResolver>>;
          try {
            // @ts-expect-error TS cannot yet infer the spread of generic tuple
            result = await originalResolver(...resolverArgs);
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
      } as any;
    },
  );

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
