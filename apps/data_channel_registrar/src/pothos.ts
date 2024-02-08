import SchemaBuilder from '@pothos/core';
import { Context } from 'hono';
import {filter} from "graphql-yoga";

const builder = new SchemaBuilder<{
    Context: {
        D0_NAMESPACE: string
    }
}>({ });


const d0Stub: DataChannel[] = [] as Array<DataChannel>
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
            organization: t.arg.string({required: false}),
            name: t.arg.string({required: false})
        },
        resolve: (root, {organization, name}) => {
            if (!organization) {
                return d0Stub
            }
            const channels = d0Stub.filter((datachan) => {
                if (datachan.organization.startsWith(organization)) {
                    if (name) {
                        if (datachan.name.startsWith(name)) {
                            return true
                        } else {
                            return false
                        }
                    } else {
                        // matches org and name not set
                        return true
                    }
                } else {
                    return false
                }
            })
            return channels
        }
    }),
    getDataChannel: t.field({
        type: DataChannel,
        nullable: true,
        args: {
            organization: t.arg.string({require: true}),
            name: t.arg.string({require: true})
        },
        resolve: (root, {organization, name}, context) => {
            const filtered = d0Stub.filter(item => {
                if (item.organization == organization && item.name == name) {
                    return true
                }

                return false
            })

            if (filtered.length == 1) {
                return filtered[0]
            }

            return  undefined

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
                const dc = new DataChannel(organization as string, name as string, endpoint as string)

                d0Stub.push(dc)

                return dc
            }
        }),
        deleteDataChannel: t.field({
            type: DataChannel,
            args: {
                organization: t.arg.string({required: true}),
                name: t.arg.string({required: true}),
            },
            resolve: (root, {organization, name}, context) => {
                return new DataChannel(organization as string, name as string, "endpoint")
            }
        })
    })
})

export const schema = builder.toSchema()
