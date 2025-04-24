import { createLocalJWKSet, jwtVerify, SignJWT } from 'jose';
import { describe, expect, it } from "vitest";
import { JWT } from "../src/jwt";
import { KeyState } from "../src/keystate";
const KEY_ALG = 'EdDSA'

describe("testing key state class", () => {
	it("serialize and deserialize", async () => {
		const key = new KeyState()
		await key.init()
		expect(key.publicKey).toBeDefined()

		const jwtReq = new JWT("test", [], "testissuer")
		const token = await (new SignJWT(jwtReq.payloadRaw(1000000)).setProtectedHeader({ alg: KEY_ALG }).sign(key.privateKey));
		expect(token).toBeDefined()

		const dKey = await key.serialize()


		const jwkPub = await createLocalJWKSet({
			keys: [dKey.public],
		});

		const { payload, protectedHeader } = await jwtVerify(token, jwkPub);
		expect(payload.iss).toBe("testissuer")
		expect(payload.sub).toBe("test")
	})
})