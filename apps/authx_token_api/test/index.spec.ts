import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {KeyState} from "../src/keystate"
import {JWT} from "../src/jwt"
import { generateKeyPair, jwtVerify, KeyLike, exportSPKI, importSPKI, SignJWT, exportJWK, importJWK, JWK, createLocalJWKSet } from 'jose';
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