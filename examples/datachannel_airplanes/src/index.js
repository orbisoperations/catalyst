import { Hono } from 'hono';
import { createYoga } from 'graphql-yoga';
import { printSchema, lexicographicSortSchema } from 'graphql';
import { VerifyingClient, grabTokenInHeader } from "@catalyst/jwt";
import SchemaBuilder from '@pothos/core';
const builder = new SchemaBuilder({});
class Airplane {
    manufacture;
    constructor(manufacture) {
        this.manufacture = manufacture;
    }
}
builder.objectType(Airplane, {
    name: "Airplane",
    description: "Airplane object",
    fields: (t) => ({
        manufacture: t.exposeString("manufacture", {})
    })
});
builder.queryType({
    fields: (t) => ({
        airplanes: t.field({
            type: [Airplane],
            resolve: () => {
                return [new Airplane("Airbus"), new Airplane("Boeing")];
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
const app = new Hono();
app.use(async (c, next) => {
    const [token, tokenError] = grabTokenInHeader(c.req.header("Authorization"));
    if (tokenError) {
        return c.json({
            error: tokenError.msg
        }, tokenError.status);
    }
    const verifier = new VerifyingClient("http://localhost:5052/graphql");
    const issuer = "catalyst:root:latest";
    // const [verified, error] = await verifier.verify(token, issuer, [
    //   "airplanes"
    // ])
    //
    // if (error) {
    //   return  c.json({
    //     error: error.msg
    //   }, error.status)
    // }
    // if (!verified) {
    //   return c.json({
    //     error: "JWT Invalid"
    //   }, 401)
    // }
    // we good
    await next();
});
app.get('/', (c) => {
    return c.text('airplanes');
});
app.use("/graphql", async (c) => {
    return yoga.handle(c.req.raw, c);
});
export default app;
