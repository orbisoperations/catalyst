import { Hono } from 'hono';
import { createYoga } from 'graphql-yoga';
import { printSchema, lexicographicSortSchema } from 'graphql';
import { JWTValidationResult, grabTokenInHeader, verifyJwtWithRemoteJwks } from '@catalyst/jwt';

import SchemaBuilder from '@pothos/core';

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

const app = new Hono<{ Bindings: Env }>();

app.use(async (c, next) => {
    console.log('schema: ', printSchema(schema));
    if (c.env.CATALYST_GATEWAY_URL == undefined || c.env.CATALYST_DC_ID == undefined) {
        console.error('CATALYST_GATEWAY_URL or CATALYST_DC_ID is undefined: set variables properly in environment');
        return c.json(
            {
                error: 'Internal Server Error',
            },
            500
        );
    }

    const [token, tokenError] = grabTokenInHeader(c.req.header('Authorization'));
    if (tokenError) {
        return c.json(
            {
                error: tokenError.msg,
            },
            tokenError.status
        );
    }

    const verificationResult: JWTValidationResult = await verifyJwtWithRemoteJwks(
        token,
        c.env.ISSUER,
        c.env.CATALYST_DC_ID,
        c.env.CATALYST_GATEWAY_URL.replace('graphql', '.well-known/jwks.json')
    );

    if (verificationResult.verified === false) {
        console.error('JWT Verification Error Code: ', verificationResult.errorCode, verificationResult.message);

        // handle errors
        // jwt error library
        if (verificationResult.jwtError) {
            console.error('JWT Verification Internal Error: ', verificationResult.jwtError);
            return c.json(
                {
                    error: 'Error Verifying JWT',
                },
                401
            );
        }

        if (
            verificationResult.errorCode === 'JWT_CLAIMS_MISSING' ||
            verificationResult.errorCode === 'JWT_CLAIMS_DO_NOT_ALIGN' ||
            verificationResult.errorCode === 'JWT_ISSUER_INVALID'
        ) {
            return c.json(
                {
                    error: verificationResult.message,
                },
                401
            );
        }

        // assume unexpected error
        return c.json(
            {
                error: 'Unexpected Error Verifying JWT',
            },
            500
        );
    }

    return await next();
});

app.get('/', (c) => {
    return c.text('airplanes');
});

app.use('/graphql', async (c) => {
    return yoga.handle(c.req.raw as Request, c);
});

export default app;
