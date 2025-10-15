import { beforeEach, describe, expect, it } from 'vitest';
import { JWT } from '../../src/jwt';
import { KeyState } from '../../src/keystate';
import { JWTAudience } from '@catalyst/schema_zod';

describe('KeyState', () => {
	let keyState: KeyState;

	beforeEach(async () => {
		keyState = new KeyState();
		await keyState.init();
	});

	describe('initialization', () => {
		it('should initialize with valid keys', async () => {
			expect(keyState.publicKey).toBeDefined();
			expect(keyState.publicKeyPEM).toBeDefined();
			expect(keyState.uuid).toBeDefined();
			expect(keyState.expiry).toBeDefined();
			expect(keyState.isExpired()).toBe(false);
		});

		it('should have a valid PEM format for public key', () => {
			expect(keyState.publicKeyPEM).toMatch(/^-----BEGIN PUBLIC KEY-----/);
			expect(keyState.publicKeyPEM).toMatch(/-----END PUBLIC KEY-----$/);
		});
	});

	describe('signing', () => {
		it('should sign a JWT with valid payload', async () => {
			const jwt = new JWT('test-subject', ['test-claim'], 'test-issuer', JWTAudience.enum['catalyst:datachannel']);
			const expiresIn = 3600; // 1 hour
			const signedToken = await keyState.sign(jwt, expiresIn);

			expect(signedToken).toBeDefined();
			expect(typeof signedToken).toBe('string');
			expect(signedToken.split('.')).toHaveLength(3); // header.payload.signature
		});

		it('should respect maximum expiry time', async () => {
			const jwt = new JWT('test-subject', ['test-claim'], 'test-issuer', JWTAudience.enum['catalyst:datachannel']);
			const longExpiry = keyState.expiry * 2; // Try to set expiry longer than max
			const signedToken = await keyState.sign(jwt, longExpiry);

			// Verify the token's expiry is capped at keyState.expiry
			const parts = signedToken.split('.');
			const payload = JSON.parse(atob(parts[1]));
			expect(payload.exp - payload.iat).toBeLessThanOrEqual(keyState.expiry);
		});
	});

	describe('expiration', () => {
		it('should mark key as expired', () => {
			keyState.expire();
			expect(keyState.isExpired()).toBe(true);
		});

		it('should clear public key when expired', () => {
			keyState.expire();
			expect(keyState.publicKey).toEqual({});
		});
	});

	describe('serialization', () => {
		it('should serialize and deserialize correctly', async () => {
			const serialized = await keyState.serialize();
			expect(serialized).toHaveProperty('private');
			expect(serialized).toHaveProperty('public');
			expect(serialized).toHaveProperty('uuid');
			expect(serialized).toHaveProperty('expiry');
			expect(serialized).toHaveProperty('expired');
			expect(serialized).toHaveProperty('publicPEM');

			const deserialized = await KeyState.deserialize(serialized);
			expect(deserialized.uuid).toBe(keyState.uuid);
			expect(deserialized.expiry).toBe(keyState.expiry);
			expect(deserialized.isExpired()).toBe(keyState.isExpired());
			expect(deserialized.publicKeyPEM).toBe(keyState.publicKeyPEM);
		});

		it('should maintain key functionality after deserialization', async () => {
			const serialized = await keyState.serialize();
			const deserialized = await KeyState.deserialize(serialized);

			const jwt = new JWT('test-subject', ['test-claim'], 'test-issuer', JWTAudience.enum['catalyst:datachannel']);
			const signedToken = await deserialized.sign(jwt, 3600);
			expect(signedToken).toBeDefined();
			expect(typeof signedToken).toBe('string');
		});
	});

	describe('public key access', () => {
		it('should return public key in PEM format', () => {
			const publicKey = keyState.pub();
			expect(publicKey).toBe(keyState.publicKeyPEM);
			expect(publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
		});
	});
});
