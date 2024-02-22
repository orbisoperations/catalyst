import { Hono } from 'hono'
import { DurableObjectState } from "@cloudflare/workers-types"
import {createYoga, map} from "graphql-yoga";
import SchemaBuilder from '@pothos/core';

class DataChannel {
    organization: string
    name: string
    endpoint: string

    constructor(org: string, name: string, endpoint: string) {
        this.organization = org
        this.name = name
        this.endpoint = endpoint
    }
}

class Organization {
    DataChannels: Map<string, DataChannel>

    constructor(dcs?: Map<string, DataChannel>) {
        this.DataChannels = dcs?? new Map<string, DataChannel>()
    }
}

let builder = new SchemaBuilder<{
    Context: {
        d0State: DurableObjectState
    }
}>({});

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
            resolve: async (root, {organization, name}, {d0State}): Promise<DataChannel[]> => {
                if (!organization && !name) {
                    // return all
                    const allDcs = Array.from((await d0State.storage.list<Organization>()).entries()).flatMap(([orgName, org]) => {
                        return Array.from(org.DataChannels.values())
                    })
                    return allDcs
                } else if (!organization && name) {
                    // filter on name only
                    return Array.from(((await d0State.storage.list<Organization>()).entries())).flatMap(([_, org]) => {
                        return Array.from(org.DataChannels.entries()).filter(([dcName, _]) => {
                            if (dcName.startsWith(name)) return true;
                            return false
                        }).map(([_, dc]) => dc)
                    })

                } else if (organization && !name) {
                    // filter on org only
                    return Array.from(await d0State.storage.list<Organization>({prefix: organization})).flatMap(([_, org]) => {
                        return Array.from(org.DataChannels.values())
                    })
                } else if (organization && name) {
                    // filter on all
                    return Array.from(await d0State.storage.list<Organization>({prefix: organization})).flatMap(([_, org]) => {
                        return Array.from(org.DataChannels.entries()).filter(([dcName, _]) => {
                            if (dcName.startsWith(name)) return true;
                            return false;
                        }).map(([_, dc]) => dc)
                    })
                } else {
                    return []
                }
            }
        }),
        readDataChannel: t.field({
            type: DataChannel,
            nullable: true,
            args: {
                organization: t.arg.string({required: true}),
                name: t.arg.string({required: true})
            },
            resolve: async (root, {organization, name}, {d0State}) => {
                
                return  (await d0State.storage.get<Organization>(organization))?.DataChannels.get(name)

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
            resolve: (root, {organization, name, endpoint}, {state, d0State}) => {
                console.log(`creating ${organization}/${name}@${endpoint}`)
                const dc = new DataChannel(organization as string, name as string, endpoint as string)

                if (!state.organizations.has(organization)) {
                    state.organizations.set(organization, new Map<string, DataChannel>());
                }

                if (!state.organizations.get(organization).has(name)) {
                    state.organizations.get(organization).set(name, dc)
                }

                d0State.blockConcurrencyWhile(async () => {
                    await d0State.storage.put(state)
                })

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

const schema = builder.toSchema()

export class RegistrarState {
    d0State: DurableObjectState
    app: Hono = new Hono()

    constructor(state: DurableObjectState) {
        this.d0State = state

        const yoga = createYoga({
            schema: schema,
            graphqlEndpoint: "/graphql",
            context: async () => ({
                d0State: this.d0State
            }),
        });

        this.app.use("/graphql", async (c) => {
            return yoga.handle(c.req.raw as Request, c);
        });
    }

    async fetch(request: Request) {
        return this.app.fetch(request)
    }
}