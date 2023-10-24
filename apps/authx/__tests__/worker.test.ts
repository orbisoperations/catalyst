import { afterAll, beforeAll, describe, expect, it, test, vi } from 'vitest';
import { parse } from "graphql";
import app from "../src/index"
import {setDefaultZitadelClient} from "../src/index"
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import {AuthzedClient, IZitadelClient, TokenValidation} from "../../../packages/authx"
import fs from "fs";
import { testClient } from "hono/testing"
import {Env} from "hono"

class MockZitadelClient implements IZitadelClient {
    constructor(){}

    async validateTokenByIntrospection(token: string): Promise<TokenValidation | undefined> {
        return {
            active: true,
        } as TokenValidation
    }
}

describe("health and status checks", () => {
		let testEnv: object;
        let testHeaders: object;
		beforeAll(async () => {
			testEnv = {
				AUTHZED_TOKEN: "healthandstatus",
				AUTHZED_ENDPOINT: "http://localhost:8081",
			}

            testHeaders = {
                Authorization: "Bearer sometoken"
            }

            setDefaultZitadelClient(new MockZitadelClient())
		})

    test("health check", async () => {
			const res = await app.request("/health",
				{
					method: "get",
                    headers: {
                        ...testHeaders
                    }
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
					method: "get",
                    headers: {
                        ...testHeaders
                    }
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
						method: "get",
						headers: {
                            ...testHeaders
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
        const res = await app.request('/graphql?query={status{health}}',
        {
            method: "get",
            headers: {
                ...testHeaders
            }
        },
        {
            ...testEnv
        });

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
 
    test("authzed - read/write - REST", async () => {
        client = new AuthzedClient("http://localhost:8081", "readwriteuserorg")
        const writeData = await client.addUserToOrganization("orbisops", "marito")
        expect(writeData.writtenAt!.token).toBeTruthy()
        await client.addUserToOrganization("orbisops", "maritwo")

        const readData = await client.listUsersInOrganization("orbisops")
        expect(readData).toStrictEqual(["marito", "maritwo"])
    })

    test("authzed - read/write - graphql", async () => {
        // headers and env vars for test app usage
        const testEnv = {
            AUTHZED_TOKEN: "readwriteuserorggraphql",
            AUTHZED_ENDPOINT: "http://localhost:8081",
        }

        const testHeaders = {
            Authorization: "Bearer sometoken",
            "Content-Type": "application/json"
        }

        setDefaultZitadelClient(new MockZitadelClient())

        const writRes = await app.request('/graphql',
        {
            method: "POST",
            headers: {
                ...testHeaders
            },
            body: JSON.stringify({
                query: "mutation AddUserToOrg($arg1: String!, $arg2: String!) {addUserToOrganization(orgId: $arg1, userId: $arg2)}",
                variables: {
                    arg1: "orbisops",
                    arg2: "marito"
                }
            })
        },
        {
            ...testEnv
        });

        expect(writRes.status).toBe(200);

        expect(await writRes.json()).toStrictEqual({
            data: {
                addUserToOrganization: true
            }
        });


        const readRes = await app.request('/graphql',
        {
            method: "POST",
            headers: {
                ...testHeaders
            },
            body: JSON.stringify({
                query: "query ListUsersInOrg($arg1: String!) {listUsersInOrganization(orgId: $arg1)}",
                variables: {
                    arg1: "orbisops",
                }
            })
        },
        {
            ...testEnv
        });

        expect(readRes.status).toBe(200);
        expect(await readRes.json()).toStrictEqual({
            data: {
                listUsersInOrganization: [
                    "marito"
                ]
            }
        })
    })

})
