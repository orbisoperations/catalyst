// add to git

import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';

describe("jwt integration tests", () => {
  it("can get the public key", async () =>{
    console.log(env)
    const jwtDoId = env.JWT_TOKEN_DO.idFromName("default")
    const jwtStub = env.JWT_TOKEN_DO.get(jwtDoId)
    const pkey = await jwtStub.getPublicKey()
    expect(pkey).toBeDefined()
    expect(pkey).toBeTypeOf("object")
    expect(pkey.pem).toBeTypeOf("string")
  })
  it("can rotate the key", async () => {
    const jwtDoId = env.JWT_TOKEN_DO.idFromName("default")
    const jwtStub = env.JWT_TOKEN_DO.get(jwtDoId)
    const pkey1 = await jwtStub.getPublicKey()
    expect(pkey1).toBeDefined()
    expect(pkey1).toBeTypeOf("object")
    expect(pkey1.pem).toBeTypeOf("string")

    expect(await jwtStub.rotateKey()).toBeTruthy()
    const pkey2 = await jwtStub.getPublicKey()
    expect(pkey2).toBeDefined()
    expect(pkey2).toBeTypeOf("object")
    expect(pkey2.pem).toBeTypeOf("string")

    expect(pkey1.pem).not.toBe(pkey2.pem)
  })
  it("can sign and verify a jwt", async () => {
    const jwtRequest = {
      entity: "testuser",
      claims: ["testclaim"],
    }
    const jwtDoId = env.JWT_TOKEN_DO.idFromName("default")
    const jwtStub = env.JWT_TOKEN_DO.get(jwtDoId)
    const jwtToken = await jwtStub.signJWT(jwtRequest, 1000000000)
    console.log(jwtToken)
    const validateResp = await jwtStub.validateToken(jwtToken.token)
    delete validateResp["Symbol(dispose)"]
    console.log(validateResp)
    expect(validateResp.claims[0]).toBe( 'testclaim' )
    expect(validateResp.valid).toBeTruthy()
    expect(validateResp.entity).toBe("testuser")

    const invalid = await jwtStub.validateToken(jwtToken.token + "makebad")
    expect(invalid.valid).toBeFalsy()
  })
})