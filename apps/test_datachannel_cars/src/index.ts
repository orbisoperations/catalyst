import { Hono } from 'hono'
import { createYoga } from 'graphql-yoga';

import SchemaBuilder from '@pothos/core';

const builder = new SchemaBuilder({});

class Car {
  manufacture: string
  constructor(manufacture: string) {
    this.manufacture = manufacture
  }
}

builder.objectType(Car, {
  name: "Car",
  description: "Car object",
  fields: (t) => ({
    manufacture: t.exposeString("manufacture", {})
  })
})

builder.queryType({
  fields: (t) => ({
    cars: t.field({
      type: [Car],
      resolve: () => {
        return [new Car("Tesla"), new Car("Rivian")]
      }
    })
  }),
});

const schema = builder.toSchema();

const yoga = createYoga({
  schema: schema,
});

const app = new Hono()

app.get('/', (c) => {
  return c.text('cars')
})

app.use("/graphql", async (c) => {
  return yoga.handle(c.req.raw as Request, c);
});

export default app
