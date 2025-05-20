import { JWTSigningRequest, JWTSigningResponse } from '@catalyst/schema_zod'; // Assuming types are exported
import { env, SELF } from 'cloudflare:test';
import { createLocalJWKSet, jwtVerify, SignJWT } from 'jose';

import { beforeEach, describe, expect, it } from 'vitest';
import { JWT } from '../src/jwt';
import { KeyState } from '../src/keystate';
import {
	clearAllAuthzedRoles,
	custodianCreatesDataChannel,
	generateDataChannels,
	getCatalystToken,
	TEST_ORG_ID,
	validUsers,
} from './utils/testUtils';

const KEY_ALG = 'EdDSA';

// unit test
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
		// expect the algorithm to be "EdDSA"
		expect(protectedHeader.alg).toBe('EdDSA');
		expect(payload.iss).toBe('testissuer');
		expect(payload.sub).toBe('test');
		expect(payload.claims).toBeDefined();
		expect(payload.claims).toHaveLength(0);
	});
});

// integration test
describe('token signing integration test', () => {
	const CUSTODIAN_CF_TOKEN = 'cf-custodian-token';
	const CUSTODIAN_USER = validUsers[CUSTODIAN_CF_TOKEN];

	beforeEach(async () => {
		await clearAllAuthzedRoles();
	});

	it('should return an error response if jwtRequest claims array is empty', async () => {
		// Arrange
		const jwtRequest: JWTSigningRequest = {
			claims: [], // Empty claims array
			entity: 'some-entity',
		};
		const expiresIn = 3600; // 1 hour

		// Act
		const response = await SELF.signJWT(jwtRequest, expiresIn, {
			cfToken: 'cf-custodian-token',
		});

		// Assert
		const expectedResponse = JWTSigningResponse.parse({
			success: false,
			error: 'invalid claimes error: JWT creating request must contain at least one claim',
		});

		expect(response).toEqual(expectedResponse);
	});

	it('must provide a CF token', async () => {
		// Arrange
		const jwtRequest: JWTSigningRequest = {
			claims: ['airplanes'],
			entity: 'some-entity',
			expiresIn: 3600,
		};

		const response = await SELF.signJWT(jwtRequest, 3600, {
			cfToken: undefined,
		});
		expect(response).toEqual({
			success: false,
			error: 'catalyst did not recieve a user-based token',
		});

		const response2 = await SELF.signJWT(jwtRequest, 3600, {
			cfToken: 'invalid-cf-token',
		});
		expect(response2).toEqual({
			success: false,
			error: 'catalyst is unable to verify user',
		});
	});

	it('entity in jwtRequest cannot be empty', async () => {
		await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);

		// Arrange
		const jwtRequest: JWTSigningRequest = {
			claims: ['channel-id'],
			entity: '',
		};
		const expiresIn = 3600; // 1 hour

		// Act for user
		// user can read from data channel
		const response = await SELF.signJWT(jwtRequest, expiresIn, {
			cfToken: CUSTODIAN_CF_TOKEN,
		});

		// Assert
		const expectedResponse = JWTSigningResponse.parse({
			success: false,
			error: 'catalyst is unable to validate user to all claims',
		});

		expect(response).toEqual(expectedResponse);
	});

	it('claims must have a valid data channel', async () => {
		await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, CUSTODIAN_USER.email);
		// create a data channel
		const dataChannel = generateDataChannels(1)[0];
		const createdChannel = await custodianCreatesDataChannel(dataChannel);

		// Arrange
		const jwtRequest: JWTSigningRequest = {
			claims: [createdChannel.id],
			entity: 'some-entity',
			expiresIn: 3600,
		};

		// Act
		const response = await SELF.signJWT(jwtRequest, 3600, {
			cfToken: CUSTODIAN_CF_TOKEN,
		});

		// Assert
		const expectedResponse = {
			success: true,
			token: expect.any(String),
			expiration: expect.any(Number),
		};
		// this is a successful response
		expect(response).toEqual(expectedResponse);
	});

	it('signing a single use token', async () => {
		// sign a single use token with a valid claim
		const catalystToken = await getCatalystToken(CUSTODIAN_CF_TOKEN, ['channel-id']);
		const singleUseToken = await SELF.signSingleUseJWT('channel-id', {
			catalystToken: catalystToken.token,
		});
		expect(singleUseToken).toEqual({
			success: true,
			token: expect.any(String),
			expiration: expect.any(Number),
		});

		// error case: empty claim on Catalyst Token
		const catalystToken2 = await getCatalystToken(CUSTODIAN_CF_TOKEN, ['']);
		const singleUseToken2 = await SELF.signSingleUseJWT('channel-id', {
			catalystToken: catalystToken2.token,
		});
		expect(singleUseToken2).toEqual({
			success: false,
			error: 'invalid claims error: JWT creating request must contain at least one claim',
		});
	});

	it('should split a catalyst token into multiple single-use tokens', async () => {
		// case: channels do not exist
		const catalystToken = await getCatalystToken(CUSTODIAN_CF_TOKEN, ['channel-id', 'channel-id2']);
		const singleUseTokens = await SELF.splitTokenIntoSingleUseTokens(catalystToken.token);
		expect(singleUseTokens).toEqual({
			success: false,
			error: 'no resources found',
		});
	});
});

describe('key management', () => {
	const PLATFORM_ADMIN_CF_TOKEN = 'cf-platform-admin-token';

	it('should rotate a key', async () => {
		const currentKey = await SELF.getPublicKey();
		const currentJWK = await SELF.getPublicKeyJWK();
		const token = await SELF.rotateKey({ cfToken: PLATFORM_ADMIN_CF_TOKEN });
		expect(token).toEqual({
			success: true,
		});
		const newKey = await SELF.getPublicKey();
		expect(newKey).not.toEqual(currentKey);
		const newJWK = await SELF.getPublicKeyJWK();
		expect(newJWK).not.toEqual(currentJWK);
	});
});
