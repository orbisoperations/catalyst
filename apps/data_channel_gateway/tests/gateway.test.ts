// @ts-ignore
import { expect, test , describe, beforeAll, afterAll} from "bun:test";

import {fetchRemoteSchema, makeRemoteExecutors, makeGatewaySchema} from "../src/index"
import {printSchema, lexicographicSortSchema, GraphQLSchema} from "graphql"

import {Miniflare} from "miniflare"

import path from "node:path"
import {exec} from "node:child_process";
import {parse} from "graphql/index";

import { createSchema, createYoga } from 'graphql-yoga'
import { buildHTTPExecutor } from '@graphql-tools/executor-http'

let manufactureService: Miniflare
let carsService: Miniflare
let airplanesService: Miniflare

beforeAll(async () => {
    const manufacturePath = path.resolve(import.meta.dirname, "../../test_datachannel_manufactures/dist/index.js")
    manufactureService = new Miniflare({
        scriptPath: manufacturePath,
        modules: true,
        modulesRoot: path.resolve(import.meta.dirname, "../../test_datachannel_manufactures"),
        modulesRules: [
            { type: "ESModule", include: ["**/*.js"], fallthrough: true },
        ],
        port: 4003
    })


    const carsPath = path.resolve(import.meta.dirname, "../../test_datachannel_cars/dist/index.js")
    carsService = new Miniflare({
        scriptPath: carsPath,
        modules: true,
        modulesRoot: path.resolve(import.meta.dirname, "../../test_datachannel_cars"),
        modulesRules: [
            { type: "ESModule", include: ["**/*.js"], fallthrough: true },
        ],
        port: 4002
    })

    const airplanesPath = path.resolve(import.meta.dirname, "../../test_datachannel_airplanes/dist/index.js")
    airplanesService = new Miniflare({
        scriptPath: airplanesPath,
        modules: true,
        modulesRoot: path.resolve(import.meta.dirname, "../../test_datachannel_airplanes"),
        modulesRules: [
            { type: "ESModule", include: ["**/*.js"], fallthrough: true },
        ],
        port: 4001,
    })

})

afterAll(async () => {
    await manufactureService.dispose();
    await carsService.dispose()
    await airplanesService.dispose()
})


describe("test gateway functions", async () => {
    test("services are up an running", async () => {
        expect((await airplanesService.ready).origin).toBe("http://127.0.0.1:4001")
        expect((await carsService.ready).origin).toBe("http://127.0.0.1:4002")
        expect((await manufactureService.ready).origin).toBe("http://127.0.0.1:4003")
    })

    test("external graphql schema introspection", async () => {
        console.log([{endpoint: (await manufactureService.ready).origin + "/graphql"}])
        const executors = makeRemoteExecutors([{endpoint: (await manufactureService.ready).origin + "/graphql" }])

        expect(executors[0]).not.toBe(undefined)
        const schema = await fetchRemoteSchema(executors[0]);
        expect(printSchema(lexicographicSortSchema(schema))).toBe("directive @canonical on ENUM | FIELD_DEFINITION | INPUT_FIELD_DEFINITION | INPUT_OBJECT | INTERFACE | OBJECT | SCALAR | UNION\n\ndirective @computed(selectionSet: String!) on FIELD_DEFINITION\n\ndirective @key(selectionSet: String!) on OBJECT\n\ndirective @merge(additionalArgs: String, argsExpr: String, key: [String!], keyArg: String, keyField: String) on FIELD_DEFINITION\n\ntype Manufacture {\n  id: ID!\n  name: String\n}\n\ntype Query {\n  _sdl: String!\n  manufacture(id: ID!): Manufacture\n  manufactures: [Manufacture]!\n}")
    })

    test("supergraphql generations", async () => {
        const schema = await makeGatewaySchema([
            {
                endpoint: "http://127.0.0.1:4001/graphql"
            },
            {
                endpoint: "http://127.0.0.1:4002/graphql"
            },
            {
                endpoint: "http://127.0.0.1:4003/graphql"
            }
        ])
        
        expect(printSchema(lexicographicSortSchema(schema))).toBe("\"\"\"Airplane object\"\"\"\ntype Airplane {\n  manufacture: String!\n}\n\ntype Car {\n  manufacture: Manufacture\n  model: String!\n}\n\ntype Manufacture {\n  id: ID!\n  name: String\n}\n\ninput ManufactureInput {\n  keys: [ManufactureKey!]!\n}\n\ninput ManufactureKey {\n  id: ID!\n}\n\ntype Query {\n  _manufactures(input: ManufactureInput): [Manufacture]!\n  _sdl: String!\n  airplanes: [Airplane!]!\n  car(model: String!): Car\n  cars: [Car]!\n  health: String!\n  manufacture(id: ID!): Manufacture\n  manufactures: [Manufacture]!\n}")

    })
})