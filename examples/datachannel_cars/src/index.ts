import { Hono } from 'hono'
import { createYoga } from 'graphql-yoga';
import { createSchema } from 'graphql-yoga'
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } = stitchingDirectives();


const cars = [
  {model: "900T", manufacureId: '3'},
  {model: "Model S", manufacureId: '1'},
  {model: "R1T", manufacureId: '2'},
]

const typeDefs = `
  ${stitchingDirectivesTypeDefs}
    type Car {
      manufacture: Manufacture
      model: String!
    }
    
    type Manufacture @key(selectionSet: "{ id }"){
      id: ID!
    }
    
    input ManufactureKey {
      id: ID!
    }
    
    input ManufactureInput {
    keys: [ManufactureKey!]!
  }
  
    type Query {
      cars: [Car]!
      car(model: String!): Car
      _manufactures(input: ManufactureInput): [Manufacture]! @merge(keyArg: "input.keys")
      _sdl: String!
    }
  `

const yoga = createYoga({
  schema: stitchingDirectivesValidator(
      createSchema({
        typeDefs: typeDefs ,
        resolvers: {
          Car: {
            manufacture: car => ({id: car.manufacureId})
          },
          Query: {
            cars: () => cars,
            car: (_, {model}) => {
              const filtered = cars.filter((car) => {
                return car.model === model
              })
            },
            _manufactures: (_root, {input}) => input.keys,
            _sdl: () => typeDefs,
          }
        }

      })
  ),
});

const app = new Hono()

app.get('/', (c) => {
  return c.text('cars')
})

app.use("/graphql", async (c) => {
  return yoga.handle(c.req.raw as Request, c);
});

export default app
