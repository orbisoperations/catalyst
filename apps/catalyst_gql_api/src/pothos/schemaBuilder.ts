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
    creatorOrganization: t.exposeString('creatorOrganization'),
  }),
});

const DataChannelInput = builder.inputType('DataChannelInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    endpoint: t.string({ required: true }),
    creatorOrganization: t.string({ required: true }),
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
    dataChannelById: t.field({
      type: DataChannelObject,
      nullable: true,
      args:{ id: t.arg.string()},
      resolve: async (root, args, ctx, som) => {

        return ctx.db.selectFrom('DataChannel').selectAll()
            .where('id', '=', args.id as string )
            .executeTakeFirst() as Promise<DataChannel>;
      },
    }),
    dataChannelsByCreatorOrg: t.field({
      type: [DataChannelObject],
      nullable: true,
      args:{ creatorOrganization: t.arg.string()},
      resolve: async (root, args, ctx, som) => {

        return ctx.db.selectFrom('DataChannel').selectAll()
            .where('creatorOrganization', '=', args.creatorOrganization as string )
            .execute() as Promise<[DataChannel]>;
      },
    })
  }),
});

builder.mutationType({
  fields: (t) => ({
    createDataChannel: t.field({
      type: DataChannelObject,
      args: {
        input: t.arg({ type: DataChannelInput, required: true }),
      },
      resolve: (root, args, ctx) => {
        const dataChannelRec= { id: crypto.randomUUID(), name: args.input.name, endpoint: args.input.endpoint, creatorOrganization: args.input.creatorOrganization }
        return  ctx.db.insertInto('DataChannel').values(dataChannelRec as any)
            .returningAll()
            .executeTakeFirst() as Promise<DataChannel>;
      }
    }),
  }),
});

export default builder.toSchema()