import SchemaBuilder from '@pothos/core';
import {DurableObjectNamespace} from "@cloudflare/workers-types"

export const builder = new SchemaBuilder<{
    Context: {
        env: { DB: DurableObjectNamespace }
    };
}>({});

builder.queryType({
    fields: (t) => ({
        publicKey: t.string({
            resolve: () => "PEM"
        })
    })
})

builder.mutationType({
    fields: (t) => ({
        sign: t.string({
            args: {
                entity: t.arg.string({required: true}),
                claims: t.arg.stringList({required: false}),
                expiry: t.arg.int({required: false})
            },
            resolve: async (root, args) => {
                return `${args.entity}, ${args.claims}, ${args.expiry}`
            }
        })
    })
})