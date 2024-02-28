import { Hono } from 'hono'
import { createYoga } from 'graphql-yoga';
import DirectivePlugin from '@pothos/plugin-directives';


import SchemaBuilder from '@pothos/core';

const builder = new SchemaBuilder({});

class Car {
  type: string
  manufactureId: number
  constructor(type: string, manufactureid: number) {
    this.type = type
    this.manufactureId = manufactureid
  }
}

class Manufacture {
  id: number
  constructor(id: number) {
    this.id = id
  }
}

builder.objectType(Manufacture, {
  name: "Manufacture",
  fields: (t) => ({
    id: t.exposeInt("id", {})
  })
})

builder.objectType(Car, {
  name: "Car",
  description: "Car object",
  fields: (t) => ({
    type: t.exposeString("type", {}),
    manufacture: t.field({
      type: Manufacture,
      resolve: () => {
        return new Manufacture(1)
      } 
    }) 
  })
})


builder.queryType({
  fields: (t) => ({
    cars: t.field({
      type: [Car],
      resolve: () => {
        return [new Car("Tesla", 1), new Car("Rivian", 2)]
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
