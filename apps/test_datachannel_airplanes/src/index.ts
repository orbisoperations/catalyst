import { Hono } from 'hono'
import { createYoga } from 'graphql-yoga';
import { printSchema, lexicographicSortSchema } from 'graphql';


import SchemaBuilder from '@pothos/core';

const builder = new SchemaBuilder({});

class Airplane {
  manufacture: string
  constructor(manufacture: string) {
    this.manufacture = manufacture
  }
}

builder.objectType(Airplane, {
  name: "Airplane",
  description: "Airplane object",
  fields: (t) => ({
    manufacture: t.exposeString("manufacture", {})
  })
})

builder.queryType({
  fields: (t) => ({
    airplanes: t.field({
      type: [Airplane],
      resolve: () => {
        return [new Airplane("Airbus"), new Airplane("Boeing")]
      }
    }),
    _sdl: t.field(({
      type: "String",
      resolve: () => {
        return printSchema(lexicographicSortSchema(schema));
      }
    }))
  }),
});

const schema = builder.toSchema();

const yoga = createYoga({
  schema: schema,
});

const app = new Hono()

app.get('/', (c) => {
  return c.text('airplanes')
})

app.use("/graphql", async (c) => {
  return yoga.handle(c.req.raw as Request, c);
});

export default app
