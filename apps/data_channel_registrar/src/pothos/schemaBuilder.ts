import SchemaBuilder from '@pothos/core';
import { DurableObjectNamespace } from "@cloudflare/workers-types"

const builder = new SchemaBuilder<{
  Context: {
    env: {
      DONamespace: DurableObjectNamespace
    }
  }
}>({});

function getDOStub(namespace: DurableObjectNamespace) {
  const id = namespace.idFromName("default")
  return namespace.get(id)
}

export type DataChannel = {
  id: string;
  accessSwitch: boolean;
  name: string;
  endpoint: string;
  description: string | null;
  creatorOrganization: string;
}

const DataChannelObject = builder.objectRef<DataChannel>('DataChannel');

DataChannelObject.implement({
  fields: t => ({
    id: t.exposeID('id'),
    // @ts-ignore
    accessSwitch: t.exposeBoolean('accessSwitch', { value: false }),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    endpoint: t.exposeString('endpoint'),
    creatorOrganization: t.exposeString('creatorOrganization'),
  }),
});

const DataChannelInput = builder.inputType('DataChannelInput', {
  fields: t => ({
    id: t.string({ required: false }),
    accessSwitch: t.boolean({ required: false }),
    name: t.string({ required: false }),
    description: t.string({ required: false }),
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
        console.log('allDataChannels resolving...');
        const result = (await ctx.db.selectFrom('DataChannel').selectAll().execute()) as [
          DataChannel,
        ];
        console.log('allDataChannels resolved!', JSON.stringify(result));
        return result;
      },
    }),
    dataChannelsByClaims: t.field({
      type: [DataChannelObject],
      nullable: true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      args: {
        claims: t.arg.stringList({ required: false }),
      },
      resolve: async (root, args, ctx, som) => {
        console.log('dataChannelsByClaims resolving...');

        if (args.claims) {
          const result = (await ctx.db
            .selectFrom('DataChannel')
            .selectAll()
            .where(({ eb, and }) =>
              and([eb('name', 'in', args.claims ?? []), eb('accessSwitch', '=', 1)]),
            )
            .execute()) as [DataChannel];

          const channels = await resp.json<DataChannel[]>()

          console.log({RESULT: channels});

          return channels;
        }
        return [];
      },
    }),
    dataChannelById: t.field({
      type: DataChannelObject,
      nullable: true,
      args: { id: t.arg.string() },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      resolve: async (root, args, ctx, som) => {
        // @ts-ignore
        return ctx.env.state.storage.get<DataChannel>(args.id, {})
      },
    }),
    /*dataChannelsByCreatorOrg: t.field({
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
    }),*/
  }),
});

builder.mutationType({
  fields: t => ({
    createDataChannel: t.field({
      type: DataChannelObject,
      args: {
        input: t.arg({ type: DataChannelInput, required: true }),
      },
      resolve: async (root, args, ctx) => {
        const dataChannelRec: DataChannel = {
          id: crypto.randomUUID(),
          // @ts-ignore
          accessSwitch: args.input.accessSwitch ?? false,
          name: args.input.name!,
          description: args.input.description ?? 'nothing provided',
          endpoint: args.input.endpoint!,
          creatorOrganization: args.input.creatorOrganization!,
        };

        console.log(ctx.env)
        const doStub = getDOStub(ctx.env.DONamespace)
        const resp = await doStub.fetch("https://registrar/create", {
          method: "POST",
          body: JSON.stringify(dataChannelRec),
          headers: {
          "Content-Type": "application/json"
          }
        })
        console.log(resp)
        const {id} = await resp.json<{id: string}>()
        console.log(id)
        return dataChannelRec
      },
    }),

    /*deleteDataChannel: t.field({
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

        args.input.accessSwitch === undefined || args.input.accessSwitch === null
          ? delete dataChannelNewValuesRec.accessSwitch
          : (dataChannelNewValuesRec.accessSwitch = args.input.accessSwitch);

        args.input.description
          ? (dataChannelNewValuesRec.description = args.input.description)
          : delete dataChannelNewValuesRec.description;

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
    }),*/
  }),
});

export default builder.toSchema();
