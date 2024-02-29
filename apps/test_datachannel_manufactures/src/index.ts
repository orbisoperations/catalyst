import { Hono } from 'hono'
import {createYoga, filter} from 'graphql-yoga';
import { createSchema } from 'graphql-yoga'
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } = stitchingDirectives();

const manufactures = [
  {id: "1", name: "Tesla"},
  {id: "2", name: "Rivian"},
  {id: "3", name: "Saab"},
  {id: "4", name: "Airbus"},
  {id: "5", name: "Boeing"}
]

const typeDefs = `
  ${stitchingDirectivesTypeDefs}
    type Manufacture @canonical {
      id: ID!
      name: String
    }
  
    type Query {
      manufactures: [Manufacture]!
      manufacture(id: ID!): Manufacture @merge(keyField: "id")
      _sdl: String!
    }
  `

export const schema = createSchema({
  typeDefs: typeDefs ,
  resolvers: {
    Query: {
      manufactures: () => manufactures,
      manufacture: (_, {id}) => {
          const filtered = manufactures.filter((man) => {
            return man.id === id
          })
          if (filtered.length === 1) {
            return filtered[0]
          }

          return undefined
      },
      _sdl: () => typeDefs,
    }
  }
})

const yoga = createYoga({
  schema: schema,
});

const app = new Hono()

app.get('/', (c) => {
  return c.text('manufactures')
})

app.use("/graphql", async (c) => {
  console.log(c.req.raw)
  return yoga.handle(c.req.raw, c);
});

export default app
