import { createYoga } from 'graphql-yoga';
import SchemaBuilder from '@pothos/core';
import { Context } from 'hono';
import { Parser } from 'graphql/language/parser';

const builder = new SchemaBuilder({});

export class DataChannel {
    organization: string
    name: string
    endpoint: string

    constructor(org: string, name: string, endpoint: string) {
        this.organization = org
        this.name = name
        this.endpoint = endpoint
    }
}

builder.objectType(DataChannel, {
    name: "DataChannel",
    description: "Data Channels are the primative for federated data",
    fields: (t) => ({
        organization: t.exposeString("organization", {}),
        name: t.exposeString("name", {}),
        endpoint: t.exposeString("endpoint", {})
    }),
})

builder.queryType({
  fields: (t) => ({
    listDataChannels: t.field({
        type: [DataChannel],
        args: {
            organization: t.arg.string({require: true}),
            name: t.arg.string({require: true})
        },
        resolve: () => {
            return [new DataChannel("testorg", "testname", "testend")]
        }
    }),
    dataChannel: t.field({
        type: DataChannel,
        args: {
            organization: t.arg.string({require: true}),
            name: t.arg.string({require: true})
        },
        resolve: (root, args, context) => {
            return new DataChannel("testorg", "testname", "testend")
        }
    })
  }),
});

builder.mutationType({
    fields: (t) => ({
        upsertDataChannel: t.field({
            type: DataChannel,
            args: {
                organization: t.arg.string({require: true}),
                name: t.arg.string({require: true}),
                endpoint: t.arg.string({require: true})
            },
            resolve: (root, {organization, name, endpoint}, context) => {
                console.log(`upserting ${organization}/${name}@${endpoint}`)

                return new DataChannel(organization as string, name as string, endpoint as string)
            }
        }),
        deleteDataChannel: t.field({
            type: DataChannel,
            args: {
                organization: t.arg.string({require: true}),
                name: t.arg.string({require: true}),
            },
            resolve: (root, {organization, name}, context) => {
                return new DataChannel(organization as string, name as string, "endpoint")
            }
        })
    })
})

export const schema = builder.toSchema()
