import SchemaBuilder from '@pothos/core';
import {DurableObjectNamespace, DurableObjectStub} from "@cloudflare/workers-types"

export const builder = new SchemaBuilder<{
    Context: {
        env: { HSM: DurableObjectNamespace }
    };
}>({});


function getDurableNamespace(d0: DurableObjectNamespace): DurableObjectStub {
    const id = d0.idFromName('default')
    const obj = d0.get(id)
    return obj
}

const VerifyResponseObject = builder.objectRef<{
    valid: boolean,
    claims: string[]
}>('VerifyResponse');


builder.queryType({
    fields: (t) => ({
        publicKey: t.string({
            resolve: async (root, args, context) => {
                const d0 = getDurableNamespace(context.env.HSM)
                const pubKeyResp = await d0.fetch("http://d0.stub/pub", {
                    method: "GET"
                })
                const {pem} = await pubKeyResp.json<{pem:string}>()
                return  pem
            }
        }),
        validate: t.field({
            args: {
                token: t.arg.string({required: true})
            },
            type: VerifyResponseObject,
            resolve: async (root, args, context) => {
                const d0 = getDurableNamespace(context.env.HSM)
                const validateResp = await d0.fetch("https://authx-token-api.do-hsm/validate", {
                    method: "POST",
                    body: JSON.stringify({
                        token: args.token
                    })
                })

                const {valid, error} = await validateResp.json<{valid?: true, error?: string}>()
                if (error) {
                    console.error(error)
                }
                return {
                    valid: valid?? false,
                    claims: ['foo', 'bar'],
                }
            }
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
            resolve: async (root, args, context) => {
                const d0 = getDurableNamespace(context.env.HSM)
                const validateResp = await d0.fetch("https://authx-token-api.do-hsm/sign", {
                    method: "POST",
                    body: JSON.stringify({
                        entity: args.entity,
                        claims: args.claims,
                        expiresIn: args.expiry
                    })
                })

                const { token, error } = await validateResp.json<{token?: string, error?: string}>()
                if (error) {
                    console.error(error)
                    return ""
                }
                return token?? ""
            }
        })
    })
})

export default  builder.toSchema()
