import { JWTSigningRequest, JWTSigningResponse } from '@catalyst/schema_zod'; // Assuming types are exported
import { SELF } from 'cloudflare:test';
import { createLocalJWKSet, jwtVerify, SignJWT } from 'jose';

import { describe, expect, it } from 'vitest';
import { JWT } from '../src/jwt';
import { KeyState } from '../src/keystate';

const KEY_ALG = 'EdDSA';

describe('testing key state class', () => {
	it('serialize and deserialize', async () => {
		const key = new KeyState();
		await key.init();
		expect(key.publicKey).toBeDefined();

		const jwtReq = new JWT('test', [], 'testissuer');
		const token = await new SignJWT(jwtReq.payloadRaw(1000000)).setProtectedHeader({ alg: KEY_ALG }).sign(key.privateKey);
		expect(token).toBeDefined();

		const dKey = await key.serialize();

		const jwkPub = await createLocalJWKSet({
			keys: [dKey.public],
		});

		const { payload, protectedHeader } = await jwtVerify(token, jwkPub);
		expect(payload.iss).toBe('testissuer');
		expect(payload.sub).toBe('test');
	});
});

describe('should not be able to create a token without claims', () => {
	it('should return an error response if jwtRequest claims array is empty', async () => {
		// Arrange
		const jwtRequest: JWTSigningRequest = {
			claims: [], // Empty claims array
			entity: 'some-entity',
		};
		const expiresIn = 3600; // 1 hour

		// Act
		const response = await SELF.signJWT(jwtRequest, expiresIn, {
			cfToken: 'admin-cf-token',
		});

		// Assert
		const expectedResponse = JWTSigningResponse.parse({
			success: false,
			error: 'invalid claimes error: JWT creating request must contain at least one claim',
		});

		console.log(response, 'response');
		expect(response).toEqual(expectedResponse);
	});
});
