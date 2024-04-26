// tests/index.spec.ts

// @ts-ignore
import { env, ProvidedEnv, createExecutionContext, SELF} from 'cloudflare:test';
import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {Logger} from "tslog";

const logger = new Logger();

describe("issued-jwt-registry unit tests", () => {
	it("create issued-jwt-registry entry", async () => {

	const newIJR =	{
		id: "jwt_1",
		name: "my_first_jwt",
		description: "the first one we have ever tested",
		claims: ["claim1", "claim2"],
		expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
		hash: "alsdfanlkweopivnweoiwe"
	}
	const savedIJR = await env.ISSUED_JWT_REGISTRY.create("dotest", newIJR)

		expect(newIJR.id).toBeDefined();
		expect(newIJR.name).toBe("my_first_jwt");
	})
});
