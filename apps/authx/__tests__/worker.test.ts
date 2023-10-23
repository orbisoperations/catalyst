import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { parse } from "graphql";
import app from "../src/index"
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import {AuthzedClient} from "../../../packages/authx"
import fs from "fs";
import { testClient } from "hono/testing"
import {Env} from "hono"
describe("health and status checks", () => {
		let testEnv: object;
		beforeAll(async () => {
			testEnv = {
				
			}
		})

    test("health check", async () => {
			const res = await app.request("/health",
				{
					method: "get",
				},
				{
					...testEnv
				}
			);
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('ok')
    })

    test("status check", async () => {
			const res = await app.request('/status',
				{
					method: "get"
				},
				{
					...testEnv
				});
        expect(res.status).toBe(200)
        expect(await res.json()).toStrictEqual({
            health: "ok",
        })
    })

    test("graphql health check", async() => {

        const res = await app.request('/graphql?query={health}',
					{
						method: "post",
						headers: {
						}
					},
					{
						...testEnv
					});

        expect(res.status).toBe(200);

        expect(await res.json()).toStrictEqual({
            data: {
                health: "ok",
            }
        })

    })

    test("graphql status check", async() => {
        const res = await tc['/graphql?query={status{health}}'].$get();

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

      }, 100000);

    afterAll(async () => {
    await authzed.stop();
    });

    test("read/write user/org relationship", async () => {
        client = new AuthzedClient("http://localhost:8081", "readwriteuserorg")
        test("authzed api", async () => {
            const writeData = await client.AddUserToOrganization("orbisops", "marito")

            expect(writeData.writtenAt.token).toBeTruthy()

            const readData = await client.ReadUsersInOrganization("orbisops")
            expect(readData).not.toBeNull()
            expect(readData.result).not.toBeNull()
            expect(readData.result.relationship).not.toBeNull()
            expect(readData.result.relationship.subject).not.toBeNull()
            expect(readData.result.relationship.subject.object).not.toBeNull()
            expect(readData.result.relationship.subject.object.objectId).not.toBeNull()

            expect(readData.result.relationship.subject.object.objectId).toStrictEqual("marito")
        })

        test("cfworker graphql", async () => {

        })
    })



})
