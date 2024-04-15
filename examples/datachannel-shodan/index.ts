import { createSchema, createYoga } from 'graphql-yoga';
import { Request, ExecutionContext } from "@cloudflare/workers-types";

interface Environment {
  SHODAN_API_KEY: string;
}

export default {
  async fetch(req: Request, env: Environment, ctx: ExecutionContext) {
      const yoga = createYoga<{
        env: Environment;
      }>({
          schema: createSchema({
              typeDefs: /* GraphQL */ `
                  type CriticalAsset {
                      ip: String
                      port: Int
                      service: String
                      location: String
                      org: String
                      product: String
                      version: String
                      lat: Float
                      lon: Float
                  }

                  type Query {
                      criticalAssetsWithinDistance(lat: Float!, lon: Float!, dist: Float!): [CriticalAsset!]!
                  }
              `,
            resolvers: {
              Query: {
                criticalAssetsWithinDistance: async (_parent, args, context) => {
                  const { lat, lon, dist } = args;
                  const { SHODAN_API_KEY } = context.env;

                  const data = await retrieveCriticalInfrastructure(
                      { lat, lon, dist },
                      { shodanApiKey: SHODAN_API_KEY }
                  );

                  return data.map((asset: any) => ({
                    ip: asset.ip_str,
                    port: asset.port,
                    service: asset.data,
                    location: asset.location.country_name,
                    org: asset.org,
                    product: asset.product,
                    version: asset.version,
                    lat: asset.location.latitude,
                    lon: asset.location.longitude
                  }));
                }
              }
            }
          }),
        context: { env }
      });

    return yoga(req as any, { env });
  }
};