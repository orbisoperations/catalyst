// import "../../issued-jwt-registry/src/index"
import { env } from 'cloudflare:test';
import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {Logger} from "tslog";
import { IssuedJWTRegistry } from '@catalyst/schema_zod';

const logger = new Logger();

describe("issued-jwt-registry unit tests", () => {
	it("create issued-jwt-registry entry",  async () => {

	const newIJR =	{
		id: "jwt_1",
		name: "my_first_jwt",
		description: "the first one we have ever tested",
		claims: ["claim1", "claim2"],
		expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
		organization: "orbis_operations",
	}

	const savedIJR =   await env.ISSUED_JWT_WORKER.create("orbis_operations", newIJR);

		expect(savedIJR.id).toBeDefined();
		expect(savedIJR.name).toBe("my_first_jwt");
	})

	it("update issued-jwt-registry entry",  async () => {

		const changedIJR =	{
			id: "jwt_1",
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2", "claim3"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 48)), //2 days from now
			organization: "orbis_operations",
		}

		const savedChangedIJR =   await env.ISSUED_JWT_WORKER.update("orbis_operations", changedIJR);

		expect(savedChangedIJR.id).toBeDefined();
		expect(savedChangedIJR.name).toBe("my_first_jwt");
		expect(savedChangedIJR.claims.length).toBe(3);
		expect(savedChangedIJR.expiry).toStrictEqual(changedIJR.expiry);
	})

	it("get issued-jwt-registry entry, then delete it",  async () => {
		const anotherIJR =	{
			id: "jwt_1",
			name: "my_third_jwt",
			description: "the third one we have ever tested",
			claims: ["claim1", "claim2", "claim3"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 92)), //days away
			organization: "orbis_operations",
		}
		const madeIJR =   await env.ISSUED_JWT_WORKER.create("orbis_operations", anotherIJR);
		const retrievedIJR:IssuedJWTRegistry | undefined =   await env.ISSUED_JWT_WORKER.get("orbis_operations", madeIJR.id);
		if (retrievedIJR) {
			expect(retrievedIJR.id).toBeDefined();
			expect(retrievedIJR.name).toStrictEqual(anotherIJR.name);
			expect(retrievedIJR.claims.length).toBe(3);
		}else{
			throw new Error("Could not retrieve the issued JWT registry entry");
		}

		const deletedIJR =   await env.ISSUED_JWT_WORKER.delete("orbis_operations", retrievedIJR.id);
		expect(deletedIJR).toBe(true);

	})

	it("list issued-jwt-registry entries by organization claim",  async () => {

		const newIJR1 =	{
			id: "jwt_1",
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claimA", "claimX"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
			organization: "orbis_operations",
		}

		const newIJR2 =	{
			id: "jwt_2",
			name: "my_second_jwt",
			description: "the second one we have ever tested",
			claims: ["claimA", "claimB"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
			organization: "orbis_operations",
		}

		const madeIJR1 =   await env.ISSUED_JWT_WORKER.create("orbis_operations", newIJR1);
		const madeIJR2 =   await env.ISSUED_JWT_WORKER.create("orbis_operations", newIJR2);
		const madeIJR3 =   await env.ISSUED_JWT_WORKER.create("coverent", newIJR2);
		const org1BasedIJRs =   await env.ISSUED_JWT_WORKER.list("orbis_operations");

		const org2BasedIJRs =   await env.ISSUED_JWT_WORKER.list("nc_state");
		const org3BasedIJRs =   await env.ISSUED_JWT_WORKER.list("coverent");
		expect(org1BasedIJRs.length).toBe(2);
		expect(org2BasedIJRs.length).toBe(0);
		expect(org3BasedIJRs.length).toBe(1);
	})
});
