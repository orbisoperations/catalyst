// @ts-ignore
import { IssuedJWTRegistry, JWTRegisterStatus } from '@catalyst/schema_zod';
import { env, ProvidedEnv, createExecutionContext, SELF, listDurableObjectIds, runInDurableObject,} from 'cloudflare:test';
import {describe, it, expect, beforeAll, afterAll} from "vitest";

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
		
		const id = env.ISSUED_JWT_REGISTRY_DO.idFromName("creation");
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(id);

		const resp = await stub.create(newIJR);

		expect(newIJR.id).toBeDefined();
		expect(newIJR.name).toBe("my_first_jwt");
	})

	it("get an issued-jwt-registry entry", async () => {
		const id = env.ISSUED_JWT_REGISTRY_DO.idFromName("creation");
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(id);

		const newIJR =	{
			//id: "jwt_1",
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
			hash: "alsdfanlkweopivnweoiwe"
		}
		const newIJRResp = await stub.create(newIJR);
		const resp = await stub.get(newIJRResp.id);
		console.error(resp)
		expect(resp).toBeDefined();
		expect(resp.name).toBe(newIJR.name);
	})

	it("can list issued-jwt-registry entries", async () => {
		const id = env.ISSUED_JWT_REGISTRY_DO.idFromName("creation");
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(id);

		const newIJR =	{
			//id: "jwt_1",
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
			hash: "alsdfanlkweopivnweoiwe",
			organization: "org 1"
		}
		const newIJRResp = await stub.create(newIJR);
		expect(newIJRResp).toBeDefined();

		const list1Entry = await stub.list("org 1");
		expect(list1Entry).toBeDefined();
		expect(list1Entry.length).toBe(1);
		
		expect(await stub.list("org 2")).toHaveLength(0);
	})

	it("can change status - item guard", async () => {
		const id = env.ISSUED_JWT_REGISTRY_DO.idFromName("creation");
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(id);

		const activeResp = await stub.JWTRegistryItemGuard({
			id: "jwt_1",
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
			hash: "alsdfanlkweopivnweoiwe",
			organization: "org 1",
			status: "active"
		});
		console.error(activeResp)
		expect(activeResp[0]).toBe(true);
		expect(activeResp[1]).toBe(false);

		const revokedResp = await stub.JWTRegistryItemGuard({
			id: "jwt_1",
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
			hash: "alsdfanlkweopivnweoiwe",
			organization: "org 1",
			status: "revoked"
		});

		expect(revokedResp[0]).toBe(true);
		expect(revokedResp[1]).toBe(false);

		const deletedResp = await stub.JWTRegistryItemGuard({
			id: "jwt_1",
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
			hash: "alsdfanlkweopivnweoiwe",
			organization: "org 1",
			status: "deleted"
		});

		expect(deletedResp[0]).toBe(false);
		expect(deletedResp[1]).toBe(false);

		const expiredResp = await stub.JWTRegistryItemGuard({
			id: "jwt_1",
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
			hash: "alsdfanlkweopivnweoiwe",
			organization: "org 1",
			status: "expired"
		});

		expect(deletedResp[0]).toBe(false);
		expect(deletedResp[1]).toBe(false);

		const activeExpiredResp = await stub.JWTRegistryItemGuard({
			id: "jwt_1",
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2"],
			expiry:  new Date(Date.now() - (1000 * 60 * 60 * 60)), 
			organization: "org 1",
			status: "active"
		});

		expect(activeExpiredResp[0]).toBe(false);
		expect(activeExpiredResp[1]).toBe(true);
	})

	it("updated status of issued-jwt-registry entry", async () => {
		const id = env.ISSUED_JWT_REGISTRY_DO.idFromName("creation");
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(id);

		const activeResp = await stub.create({
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
			hash: "alsdfanlkweopivnweoiwe",
			organization: "org 1",
			status: "active"
		});
		
		// move status to revoked
		const revoked = await stub.changeStatus(activeResp.id, "revoked");
		expect(revoked).toBe(true)

		const deleted = await stub.changeStatus(activeResp.id, "deleted");
		expect(deleted).toBe(true)

		const makeActive = await stub.changeStatus(activeResp.id, "active");
		expect(makeActive).toBe(false)

		// set as expired
		const expiredStatusResp = await stub.create({
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
			hash: "alsdfanlkweopivnweoiwe",
			organization: "org 1",
			status: "expired"
		});

		const cantDelete = await stub.changeStatus(expiredStatusResp.id, "deleted");
		expect(cantDelete).toBe(false)

		const expiredResp = await stub.create({
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2"],
			expiry:  new Date(Date.now() - (1000 * 60 * 60 * 24)), //tomorrow
			hash: "alsdfanlkweopivnweoiwe",
			organization: "org 1",
			status: "active"
		});

		const cantRevoke = await stub.changeStatus(expiredResp.id, "revoked");
		expect(cantRevoke).toBe(false)
	})

	it("can add items to the revocatoion list", async () => {
		const id = env.ISSUED_JWT_REGISTRY_DO.idFromName("creation");
		const stub = env.ISSUED_JWT_REGISTRY_DO.get(id);

		const item1 = await stub.create({
			name: "my_first_jwt",
			description: "the first one we have ever tested",
			claims: ["claim1", "claim2"],
			expiry:  new Date(Date.now() + (1000 * 60 * 60 * 24)), //tomorrow
			hash: "alsdfanlkweopivnweoiwe",
			organization: "org 1",
			status: "active"
		});

		expect(await stub.isOnRevocationList(item1.id)).toBe(false);

		expect(await stub.addToRevocationList(item1.id)).toBe(true);

		expect(await stub.isOnRevocationList(item1.id)).toBe(true);

		expect(await stub.removeFromRevocationList(item1.id)).toBe(true);

		expect(await stub.isOnRevocationList(item1.id)).toBe(false);
		
	})
});
