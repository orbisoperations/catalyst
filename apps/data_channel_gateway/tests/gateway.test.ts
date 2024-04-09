// @ts-ignore
import { expect, test , describe, beforeAll, afterAll} from "bun:test";

import {fetchRemoteSchema, makeRemoteExecutors} from "../src/index"
import {printSchema, lexicographicSortSchema} from "graphql"

import {Miniflare} from "miniflare"

import path from "node:path"
import {exec} from "node:child_process";
import {parse} from "graphql/index";

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
        port: 4001
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
        console.log([{endpoint: (await manufactureService.ready).origin}])
        const executors = makeRemoteExecutors([{endpoint: (await manufactureService.ready).origin}])
        expect(executors.length).toBe(1)
        const result = await executors[0]({
            document: parse(/* GraphQL */ `
                  {
                    _sdl
                  }
                `),
            });
        expect(result).toBe(undefined)
        const schema = await fetchRemoteSchema(executors[0]);
        expect(printSchema(lexicographicSortSchema(schema))).toBe("")
    })
})