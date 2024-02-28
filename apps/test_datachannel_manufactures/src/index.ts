import { Hono } from 'hono'
import { createYoga } from 'graphql-yoga';
import DirectivePlugin from '@pothos/plugin-directives';


import SchemaBuilder from '@pothos/core';

const builder = new SchemaBuilder({});

class Manufacture {
  id: number
  name: string
  
  constructor(id: number, name: string) {
    this.name = name
    this.id = id
  }
}

const manufactures = [
  new Manufacture(1, "Tesla"),
  new Manufacture(2, "Rivian"),
  new Manufacture(3, "Saab"),
  new Manufacture(4, "Airbus"),
  new Manufacture(5, "Boeing"),
]

builder.objectType(Manufacture, {
  name: "Manufacture",
  description: "Manufacture object",
  directives: {
    canonical: {},
    merge: {keyField: "id"}
  },
  fields: (t) => ({
    name: t.exposeString("name", {}),
    id: t.exposeInt("id", {})
  })
})

builder.queryType({
  fields: (t) => ({
    manufactures: t.field({
      type: [Manufacture],
      resolve: () => {
        return manufactures
      }
    }),
    manufacture: t.field({
      type: Manufacture,
      args: {
        id: t.arg.int({required: true}),
      },
      resolve: (parent, {id}) => {
        const matches = manufactures.filter(man => {
          if (man.id === id) {
            return true
          }

          return false
        })

        if (matches.length > 0) {
          return matches[0]
        } else {
          throw new Error("no matching manufacture")
        }
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
  return c.text('manufactures')
})

app.use("/graphql", async (c) => {
  return yoga.handle(c.req.raw as Request, c);
});

export default app
