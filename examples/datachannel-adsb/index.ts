import {createSchema, createYoga} from 'graphql-yoga';
import {Request, ExecutionContext} from "@cloudflare/workers-types";
import {retrieveADSB} from './lib';

interface Environment {
  RAPID_API_KEY: string;
}

export default {
  async fetch(req: Request, env: Environment, ctx: ExecutionContext) {
      const typeDefs = /* GraphQL */ `
      type Aircraft {
          hex: String
          flight: String
          lat: Float
          lon: Float
          alt_geom: Int
          track: Float
          gs: Float
          t: String
      }

      type Query {
          aircraftWithinDistance(lat: Float!, lon: Float!, dist: Float!): [Aircraft!]!
          _sdl: String!
      }
  `
      const yoga = createYoga<{
        env: Environment;
      }>({
          schema: createSchema({
              typeDefs: typeDefs,
            resolvers: {
              Query: {
                aircraftWithinDistance: async (_parent, args, context) => {
                  const {lat, lon, dist} = args;
                  const {RAPID_API_KEY} = context.env;

                  const data = await retrieveADSB(
                      {lat, lon, dist},
                      {rapidApiKey: RAPID_API_KEY}
                  );

                  return data.ac || [];
                },
                _sdl: () => typeDefs
              }
            }
          }),
        context: {env}
      });

    return yoga(req as any, {env});
  }
};