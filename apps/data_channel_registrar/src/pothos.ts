import { createYoga } from 'graphql-yoga';
import SchemaBuilder from '@pothos/core';
import { Context } from 'hono';

const builder = new SchemaBuilder({});

builder.queryType({
  fields: (t) => ({
    hello: t.string({
      args: {
        name: t.arg.string(),
      },
      resolve: (parent, { name }) => `hello, ${name || 'World'}`,
    }),
  }),
});

export const schema = builder.toSchema()
