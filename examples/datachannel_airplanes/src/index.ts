import { Hono } from 'hono';
import { createYoga } from 'graphql-yoga';
import { printSchema, lexicographicSortSchema } from 'graphql';
import { grabTokenInHeader } from '@catalyst/jwt';

import SchemaBuilder from '@pothos/core';
import { ContentfulStatusCode } from 'hono/utils/http-status';

const builder = new SchemaBuilder({});

class Airplane {
    manufacture: string;
    constructor(manufacture: string) {
        this.manufacture = manufacture;
    }
}

builder.objectType(Airplane, {
    name: 'Airplane',
    description: 'Airplane object',
    fields: (t) => ({
        manufacture: t.exposeString('manufacture', {}),
    }),
});

builder.queryType({
    fields: (t) => ({
        airplanes: t.field({
            type: [Airplane],
            resolve: () => {
                return [new Airplane('Airbus'), new Airplane('Boeing')];
            },
        }),
        _sdl: t.field({
            type: 'String',
            resolve: () => {
                return printSchema(lexicographicSortSchema(schema));
            },
        }),
    }),
});

const schema = builder.toSchema();

const yoga = createYoga({
    schema: schema,
});

const app = new Hono();

app.use(async (c, next) => {
    const [, tokenError] = grabTokenInHeader(c.req.header('Authorization'));
    if (tokenError) {
        return c.json(
            {
                error: tokenError.msg,
            },
            tokenError.status as ContentfulStatusCode
        );
    }

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

app.use('/graphql', async (c) => {
    return yoga.handle(c.req.raw as Request, c);
});

export default app;
