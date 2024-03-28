import SchemaBuilder from '@pothos/core';
import { CatalystKyselySchema, CatalystKyselyTypes } from '@catalyst/schema';
import { Kysely } from 'kysely';
import { DataChannel } from '@catalyst/schema/prisma/generated/kysely';

const builder = new SchemaBuilder<{
  Context: {
    db: Kysely<CatalystKyselySchema>;
  };
}>({});

const DataChannelObject = builder.objectRef<CatalystKyselyTypes.DataChannel>('DataChannel');

DataChannelObject.implement({
  fields: t => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    endpoint: t.exposeString('endpoint'),
    creatorOrganization: t.exposeString('creatorOrganization'),
  }),
});

const DataChannelInput = builder.inputType('DataChannelInput', {
  fields: t => ({
    id: t.string({ required: false }),
    name: t.string({ required: false }),
    endpoint: t.string({ required: false }),
    creatorOrganization: t.string({ required: false }),
  }),
});

builder.queryType({
  fields: t => ({
    allDataChannels: t.field({
      type: [DataChannelObject],
      nullable: true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      resolve: async (root, args, ctx, som) => {
        console.log('allDataChannels resolving...')
        const result = await ctx.db.selectFrom('DataChannel').selectAll().execute() as [DataChannel];
        console.log('allDataChannels resolved!', JSON.stringify(result))
        return result;
      },
    }),
    dataChannelById: t.field({
      type: DataChannelObject,
      nullable: true,
      args: { id: t.arg.string() },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      resolve: async (root, args, ctx, som) => {
        return ctx.db
          .selectFrom('DataChannel')
          .selectAll()
          .where('id', '=', args.id as string)
          .executeTakeFirst() as Promise<DataChannel>;
      },
    }),
    dataChannelsByCreatorOrg: t.field({
      type: [DataChannelObject],
      nullable: true,
      args: { creatorOrganization: t.arg.string() },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      resolve: async (root, args, ctx, som) => {
        return ctx.db
          .selectFrom('DataChannel')
          .selectAll()
          .where('creatorOrganization', '=', args.creatorOrganization as string)
          .execute() as Promise<[DataChannel]>;
      },
    }),
  }),
});

builder.mutationType({
  fields: t => ({
    createDataChannel: t.field({
      type: DataChannelObject,
      args: {
        input: t.arg({ type: DataChannelInput, required: true }),
      },
      resolve: (root, args, ctx) => {
        const dataChannelRec = {
          id: crypto.randomUUID(),
          name: args.input.name!,
          endpoint: args.input.endpoint!,
          creatorOrganization: args.input.creatorOrganization!,
        };
        return ctx.db
          .insertInto('DataChannel')
          .values(dataChannelRec)
          .returningAll()
          .executeTakeFirst() as Promise<DataChannel>;
      },
    }),

    deleteDataChannel: t.field({
      type: 'Boolean',
      args: {
        id: t.arg.string(),
      },
      resolve: async (root, args, ctx) => {
        const result = await ctx.db
          .deleteFrom('DataChannel')
          .where('id', '=', args.id as string)
          .executeTakeFirst();
        return result.numDeletedRows > 0;
      },
    }),

    updateDataChannel: t.field({
      type: DataChannelObject,
      args: {
        input: t.arg({ type: DataChannelInput, required: true }),
      },
      resolve: async (root, args, ctx) => {
        const dataChannelNewValuesRec: Record<string, unknown> = {};

        if (!args.input.id) throw new Error('id is required to update a data channel');

        args.input.name
          ? (dataChannelNewValuesRec.name = args.input.name)
          : delete dataChannelNewValuesRec.name;
        args.input.endpoint
          ? (dataChannelNewValuesRec.endpoint = args.input.endpoint)
          : delete dataChannelNewValuesRec.endpoint;
        args.input.creatorOrganization
          ? (dataChannelNewValuesRec.creatorOrganization = args.input.creatorOrganization)
          : delete dataChannelNewValuesRec.creatorOrganization;
        const result = (await ctx.db
          .updateTable('DataChannel')
          .set(dataChannelNewValuesRec)
          .where('id', '=', args.input.id as string)
          .returningAll()
          .executeTakeFirst()) as DataChannel;
        return result;
      },
    }),
  }),
});

export default builder.toSchema();
