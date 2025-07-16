// Next.js Custom Route Handler with GraphQL Yoga
import { createSchema, createYoga, YogaInitialContext } from 'graphql-yoga';
import { createStorage } from 'unstorage';
import httpDriver from 'unstorage/drivers/http';

interface ActiveQuery {
    id: string;
    name: string;
    value: string;
}

// Define GraphQL schema with type definitions and resolvers
const { handleRequest } = createYoga({
    schema: createSchema({
        typeDefs: /* GraphQL */ `
            # ActiveQuery Type: Represents an active query object
            type ActiveQuery {
                id: ID!
                name: String!
                value: String!
            }

            # Query Type: Defines the queries that can be executed
            type Query {
                getActive: [ActiveQuery]
            }
        `,
        resolvers: {
            Query: {
                getActive: async (
                    _parent: undefined,
                    _args: object,
                    context: YogaInitialContext
                ): Promise<ActiveQuery[]> => {
                    const host = context.request.headers.get('host');
                    const storage = createStorage({
                        driver: httpDriver({
                            base: `${host}/state`,
                        }),
                    });
                    const itemsKeys = await storage.getKeys().then((ks) => ks.map((k) => k.replace('state:', '')));
                    console.log({ itemsKeys });

                    const items = await storage.getItems(itemsKeys);

                    const mappedItems = items.map((item) => {
                        const query = item.value as ActiveQuery;
                        return {
                            id: query.id,
                            name: query.name,
                            value: query.value ?? '',
                        };
                    });
                    return mappedItems;
                },
            },
        },
    }),
    graphqlEndpoint: '/api/graphql',
    // Yoga needs to know how to create a valid Next response
    fetchAPI: { Response },
});

export { handleRequest as GET, handleRequest as POST, handleRequest as OPTIONS };
