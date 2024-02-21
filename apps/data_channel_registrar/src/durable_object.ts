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

class State {
    organizations: Map<string, Map<string, DataChannel>>
    constructor(orgs?: Map<string, Map<string, DataChannel>>) {
        this.organizations = orgs ?? new Map<string, Map<string, DataChannel>>()
    }
}

let builder = new SchemaBuilder<{
    Context: {
        state: State,
        doState: DurableObjectState
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
            resolve: (root, {organization, name}, {state}) => {
                if (!organization && !name) {
                    // return all
                    let allDCs: DataChannel[] = []
                    state.organizations.forEach((org) =>
                    {
                        org.forEach((dc) => {
                            allDCs.push(dc)
                        })
                    })

                    return allDCs
                } else if (!organization && name) {
                    // filter on name only
                    const dcs: DataChannel[] = [];
                    state.organizations.forEach((org) => {
                        org.forEach((dc, key) => {
                            if (key.startsWith(name)) {}
                            dcs.push(dc)
                        })
                    })

                    return dcs
                } else if (organization && !name) {
                    // filter on org only
                    const dcs: DataChannel[] = [];
                    state.organizations.forEach((val, key) => {
                        if (key.startsWith(organization)) {
                            dcs.push(val.values())
                        }

                    })
                    return dcs
                } else if (organization && name) {
                    // filter on all
                    const dcs: DataChannel[] = [];
                    state.organizations.forEach((channels, org) => {
                        if (org.startsWith(organization)) {
                            channels.forEach((chan, chanName) => {
                                if (chanName.startsWith(name)) {
                                    dcs.push(chan)
                                }
                            })
                        }
                    })

                    return dcs
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
            resolve: (root, {organization, name}, {state}) => {
                if (state.organizations.has(organization) &&
                    state.organizations.get(organization).has(name)) {
                    return state.organizations.get(organization).get(name)
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

const schema = builder.toSchema()

export class RegistrarState {
    d0State: DurableObjectState
    app: Hono = new Hono()
    state: State = State

    constructor(state: DurableObjectState) {
        this.d0State = state

        this.d0State.blockConcurrencyWhile(async () => {
            this.state = (await this.d0State.storage.get<State>("state"))?? new State();
        })

        const yoga = createYoga({
            schema: schema,
            graphqlEndpoint: "/graphql",
            context: async () => ({
                // This part is up to you!
                state: this.state,
                d0State: this.d0State
            }),
        });

        this.app.use("/graphql", async (c) => {
            console.log(c);
            return yoga.handle(c.req.raw as Request, c);
        });
    }

    async fetch(request: Request) {
        return this.app.fetch(request)
    }
}