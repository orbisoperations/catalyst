import { Hono } from 'hono'
import { createYoga } from 'graphql-yoga';
import { printSchema, lexicographicSortSchema } from 'graphql';
import {VerifyingClient} from "@catalyst/jwt"


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

app.use(async (c, next) => {
  // we only need to validate JWTs that we provide
  const authHeader = c.req.header("Authorization")
  // authheader should be in format "Bearer tokenstring"
  if (!authHeader) {
    return c.text("GF'd", 403)
  }

  const  headerElems = authHeader.split(" ")
  if (headerElems.length != 2) {
    return c.text("GF'd", 403)
  }

  const verifier= new VerifyingClient("http://localhost:5052/graphql")

  const jwtParams = await verifier.verify(headerElems[1])

  if (!jwtParams) {
    console.log("jwt is undefined")
    return c.text("GF'd", 403)
  }

  /// check that the issuer is good
  if (jwtParams.iss !== "catalyst:root:latest") {
    console.log("jwt issuer is bunk")
    return c.text("GF'd", 403)
  }
  // check that claims exist, non-exists is falsey, empty array can be true
  if (!("claims" in jwtParams)) {
    console.log("jwt claims non-existent")
    return c.text("GF'd", 403)
  }
  const claims: string[] = jwtParams["claims"] as string[]
  // check that our claims are in the claims
  const dataChannelClaim = "catalyst:4b5cc9f6-1636-4ded-b763-d65c1dfd9fbd:airplanes"
  if (claims.filter(e => e == dataChannelClaim).length != 1) {
    console.log("jwt does not have the right claim")
    return c.text("GF'd", 403)
  }

  // we good
  await next()
})

app.get('/', (c) => {
  return c.text('airplanes')
})

app.use("/graphql", async (c) => {
  return yoga.handle(c.req.raw as Request, c);
});

export default app
