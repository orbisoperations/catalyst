import { Gql, buildGraphQLSchema } from 'gqtx';

type DataChannel = {
  id: string;
  organization: string;
  name: string;
  endpoint: string;
}

declare module "gqtx" {
  interface GqlContext {
    dataChannels: DataChannel[]
  }
}

const DataChannelType = Gql.Object<DataChannel>({
  name: "DataChannel",
  description: "A Data Channel",
  fields: () => [
    Gql.Field({name: "id", type: Gql.NonNull(Gql.ID)}),
    Gql.Field({name: "organization", type: Gql.NonNull(Gql.String)}),
    Gql.Field({name: "name", type: Gql.NonNull(Gql.String)}),
    Gql.Field({name: "endpoint", type: Gql.NonNull(Gql.String)})
  ]
})


const Query = Gql.Query({
  fields: () => [
    Gql.Field({
      name: 'userById',
      type: DataChannelType,
      args: {
        id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
      },
      resolve: (_, args, ctx) => {
        // `args` is automatically inferred as { id: string }
        // `ctx` (context) is also automatically inferred as { viewerId: number, users: User[] }
        // Also ensures we return an `User | null | undefined` type
        return {}
      },
    }),
  ],
});


export const schema = buildGraphQLSchema({
  query:  Query
})