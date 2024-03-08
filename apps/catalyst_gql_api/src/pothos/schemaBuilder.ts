import SchemaBuilder from '@pothos/core';
import {CatalystKyselySchema, CatalystKyselyTypes} from "@catalyst/schema"
import {Env} from "../worker";
import {D1Dialect} from 'kysely-d1';
import {Kysely} from "kysely";

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
  }),
});

builder.queryType({
  fields: (t) => ({
    dataChannels: t.field({
      type: [DataChannelObject],
      resolve: async (root, args, ctx, som) => {

        return ctx.db.selectFrom('DataChannel')
            .selectAll()
            // TODO: Fix type right here
            .execute() as Promise<any>;
      },
    }),
  }),
});

export default builder;