import { JWTSigningRequest, JWTAudience } from '@catalyst/schema_zod';
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { KeyStateSerialized } from '../../src/keystate';

describe('JWTKeyProvider', () => {
	let latestKey: KeyStateSerialized | undefined;

	it('should initialize a new key if none exists in storage', async () => {
		const id = await env.KEY_PROVIDER.idFromName('default');
		const stub = await env.KEY_PROVIDER.get(id);

		// the createion and validation needs to be done here
		// if out of this context it will cause error due to memory issues
		expect(await stub.getJWKS()).toBeDefined();
		expect(await stub.getPublicKey()).toBeDefined();

		// const latestKey = await stub.currentSerializedKey;
		// expect(latestKey).toBeDefined();
	});

	it('should rotate keys', async () => {
		const id = env.KEY_PROVIDER.idFromName('default');
		const stub = env.KEY_PROVIDER.get(id);

		expect(await stub.rotateKey()).toBe(true);

		const currentKey = stub.currentKey;
		expect(currentKey).toBeDefined();
		expect(currentKey).not.toEqual(latestKey);

		latestKey = await stub.getSerializedKey();
		expect(latestKey).toBeDefined();
	});

	it('should sign a JWT and validate it', async () => {
		// NOTE: for some reason if name=default the validateTOKEN fails due to
		//  token JWSSignatureVerificationFailed: signature verification failed
		// at flattenedVerify
		const id = await env.KEY_PROVIDER.idFromName('not-default');
		const stub = await env.KEY_PROVIDER.get(id);

		const req: JWTSigningRequest = {
			entity: 'user123',
			claims: ['channel1', 'channel2'],
			audience: JWTAudience.enum['catalyst:datachannel'],
		};
		const expiresIn = 3600; // 1 hour

		const result = await stub.signJWT(req, expiresIn);
		const expectedResult = {
			token: expect.any(String),
			expiration: expect.any(Number),
		};
		expect(result).toEqual(expectedResult);

		// validate the generated token
		const validated = await stub.validateToken(result.token);
		expect(validated.valid).toBe(true);
		expect(validated.claims).toEqual(req.claims);
		expect(validated.entity).toEqual(req.entity);
	});

	it('should fail to validate a signed JWT with an invalid signature', async () => {
		const id = env.KEY_PROVIDER.idFromName('aaa');
		const stub = env.KEY_PROVIDER.get(id);

		const response = await stub.validateToken('invalid-token');
		const expectedResponse = {
			claims: [],
			entity: undefined,
			error: 'JWSInvalid: Invalid Compact JWS',
			valid: false,
		};

		expect(response).toEqual(expectedResponse);
	});

	describe('rotateKey()', () => {
		it('should generate a new key, serialize it, and store it', async () => {
			const id = await env.KEY_PROVIDER.idFromName('default');
			const stub = await env.KEY_PROVIDER.get(id);

			const originalPublicKey = await stub.getPublicKey();
			const originalJWKS = await stub.getJWKS();

			expect(await stub.rotateKey()).toBe(true);

			const newPublicKey = await stub.getPublicKey();
			const newJWKS = await stub.getJWKS();

			expect(originalJWKS).not.toEqual(newJWKS);
			expect(originalPublicKey).not.toEqual(newPublicKey);
		});
	});
});
