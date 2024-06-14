// add to git

import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import JWTRegistry from '@catalyst/issued-jwt-registry/src';
describe("jwt registry integration tests", () => {
  it("can add items to the revocation list", async () =>{
    console.log(env)
    const jwtDoID = env.JWT_REGISTRY_DO.idFromName('default');
    const jwtRegistryStub = env.JWT_REGISTRY_DO.get(jwtDoID);
    
    await jwtRegistryStub.create({
        name: "testJWT",
        description: "test jwt",
        status: "active",
        expiry: new Date(Date.now() + 1000),
        claims: ["testClaim"],
        organization: "testorg"
    })
  })
  
})

