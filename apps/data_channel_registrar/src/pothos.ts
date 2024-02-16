import SchemaBuilder from '@pothos/core';
import {getFilePath} from "hono/dist/types/utils/filepath";

const builder = new SchemaBuilder<{
    Context: {
        D0_NAMESPACE: string
    }
}>({ });


let d0Stub: DataChannel[] = [] as Array<DataChannel>
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
        nullable: {
            list: false,
            items: true
        },
        args: {
            organization: t.arg.string({required: false}),
            name: t.arg.string({required: false})
        },
        resolve: (root, {organization, name}) => {
            if (!organization && !name) {
                // return all
                return d0Stub
            } else if (!organization && name) {
                // filter on name only
                return d0Stub.filter(item => {
                    if (item.name.startsWith(name)) return true;
                    return false;
                })
            } else if (organization && !name) {
                // filter on org only
                return d0Stub.filter(item => {
                    if (item.organization.startsWith(organization)) return true;
                    return false;
                })
            } else if (organization && name) {
                // filter on all
                return d0Stub.filter(item => {
                    if (item.organization.startsWith(organization) && item.name.startsWith(name)) return true
                    return false
                })
            }
        }
    }),
    readDataChannel: t.field({
        type: DataChannel,
        nullable: true,
        args: {
            organization: t.arg.string({require: true}),
            name: t.arg.string({require: true})
        },
        resolve: (root, {organization, name}, context) => {
            const filtered = d0Stub.filter(item => {
                if (item.organization === organization && item.name === name) {
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
        createDataChannel: t.field({
            type: DataChannel,
            args: {
                organization: t.arg.string({require: true}),
                name: t.arg.string({require: true}),
                endpoint: t.arg.string({require: true})
            },
            resolve: (root, {organization, name, endpoint}, context) => {
                console.log(`creating ${organization}/${name}@${endpoint}`)
                const dc = new DataChannel(organization as string, name as string, endpoint as string)

                d0Stub.push(dc)

                return dc
            }
        }),
        updateDataChannel: t.field({
            type: DataChannel,
            nullable: true,
            args: {
                organization: t.arg.string({require: true}),
                name: t.arg.string({require: true}),
                endpoint: t.arg.string({require: true})
            },
            resolve: (root, {organization, name, endpoint}, context) => {
                console.log(`updating ${organization}/${name}@${endpoint}`)

                let itemIndex: number | undefined = undefined;
                const filter = d0Stub.filter((item, index) => {
                    if (item.organization === organization && item.name === name) {
                        itemIndex = index;
                        return false
                    }
                    return true
                })

                if (itemIndex === undefined) {
                    console.log("no index gound")
                    return undefined
                }

                if (filter.length === d0Stub.length) {
                    return  undefined
                }

                const dc = new DataChannel(d0Stub[itemIndex].organization, d0Stub[itemIndex].name, endpoint as string)
                filter.push(dc)
                d0Stub = filter

                return dc
            }
        }),
        deleteDataChannel: t.field({
            type: DataChannel,
            nullable: true,
            args: {
                organization: t.arg.string({required: true}),
                name: t.arg.string({required: true}),
            },
            resolve: (root, {organization, name}, context) => {
                let deleted: DataChannel | undefined = undefined;
                const filtered: DataChannel[] = []
                for (const e of d0Stub) {
                    if (e.organization == organization && e.name) {
                        deleted = e;
                    } else {
                        filtered.push(e);
                    }
                }

                console.log("new set of dcs: ", d0Stub, filtered)
                d0Stub = filtered

                return deleted
            }
        })
    })
})

export const schema = builder.toSchema()
