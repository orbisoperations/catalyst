import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { parse } from "graphql";
import app from "../src/index"
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import {AuthzedClient} from "../../../packages/authx/src/authzed"
import fs from "fs";
describe("health and status checks", () => {
    test("health check", async () => {
        const res = await app.request('/health')
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('ok')
    })

    test("status check", async () => {
        const res = await app.request('/status')
        expect(res.status).toBe(200)
        expect(await res.json()).toStrictEqual({
            health: "ok",
        })
    })

    test("graphql health check", async() => {

        const res = await app.request('/graphql?query={health}');

        expect(res.status).toBe(200);

        expect(await res.json()).toStrictEqual({
            data: {
                health: "ok",
            }
        })

    })

    test("graphql status check", async() => {
        const res = await app.request('/graphql?query={status{health}}');

        expect(res.status).toBe(200);

        expect(await res.json()).toStrictEqual({
            data: {
                status: {
                    health: "ok"
                }
            }
        })
    })


})

describe("authzed/spicedb testing", () => {
    let authzed: StartedTestContainer;
    let client: AuthzedClient
    beforeAll(async () => {
        const schema = fs.readFileSync("./schema.zaml")

        authzed = await new GenericContainer("authzed/spicedb")
        .withCommand(["serve-testing", "--http-enabled", "--skip-release-check=true", "--log-level", "debug","--load-configs", "/schema.zaml"])
        .withResourcesQuota({ memory: 1, cpu: 1 })
        .withCopyContentToContainer([{
            content: schema,
            target: "/schema.zaml"
        }])
        .withExposedPorts({
            container: 50051,
            host: 50051
        },
        {
            container: 8081,
            host: 8081
        })
        .withWaitStrategy(Wait.forHttp("/healthz", 8081))
        .start();

        client = new AuthzedClient("http://localhost:8081", "testingtoken")
      }, 100000);
    
    afterAll(async () => {
    await authzed.stop();
    });

    test("write user/org relationship", async () => {
        const writeData = await client.AddUserToOrganization("orbisops", "marito")

        expect(writeData.writtenAt.token).toBeTruthy()

        const readData = await client.ReadUsersInOrganization("orbisops")
        expect(readData).toStrictEqual({})
    })
})
