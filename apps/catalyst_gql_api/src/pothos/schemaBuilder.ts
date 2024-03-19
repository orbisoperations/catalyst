import SchemaBuilder from '@pothos/core';
import {CatalystKyselySchema, CatalystKyselyTypes} from "@catalyst/schema"
import {Kysely} from "kysely";
import { DataChannel } from '@catalyst/schema/prisma/generated/kysely';

const builder = new SchemaBuilder<{
  Context: {
    db: Kysely<CatalystKyselySchema>;
  }
}>({});



const DataChannelObject = builder.objectRef<CatalystKyselyTypes.DataChannel>('DataChannel');

DataChannelObject.implement({
  fields: (t) => ({
    // Expose various fields of the CountryCodeISO3166 model, marking some as nullable as per the database schema.
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    endpoint: t.exposeString('endpoint'),
    organization: t.exposeString('organization'),
  }),
});

builder.queryType({
  fields: (t) => ({
    allDataChannels: t.field({
      type: [DataChannelObject],
      nullable: true,
      resolve: async (root, args, ctx, som) => {

        return ctx.db.selectFrom('DataChannel')
            .selectAll()
            .execute() as Promise<[DataChannel]>;
      },
    }),
    dataChannelByName: t.field({
      type: DataChannelObject,
      nullable: true,
      args:{ name: t.arg.string()},
      resolve: async (root, args, ctx, som) => {

        return ctx.db.selectFrom('DataChannel').selectAll()
            .where('name', '=', args.name as string )
            .executeTakeFirst() as Promise<DataChannel>;
      },
    }),
    dataChannelsByOrg: t.field({
      type: [DataChannelObject],
      nullable: true,
      args:{ organization: t.arg.string()},
      resolve: async (root, args, ctx, som) => {

        return ctx.db.selectFrom('DataChannel').selectAll()
            .where('organization', '=', args.organization as string )
            .execute() as Promise<[DataChannel]>;
      },
    })
  }),
});

// builder.mutationType({
//   fields: (t) => ({
//     // Add mutation that returns a simple boolean
//     t.field({
//       type: DataChannelObject,
//       args: {
//         name: t.arg.string(),
//         endpoint: t.arg.string(),
//         organization: t.arg.string(),
//       },
//       resolve: async (root, args) => {
//         const dataChannel = {
//           name: args.name,
//             endpoint: args.endpoint,
//               organization: args.organization
//         };
//
//         await create(dataChannel);
//
//         return dataChannel;
//       },
//     }),
//   }),
// });

export default builder.toSchema()
