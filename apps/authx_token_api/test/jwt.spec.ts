import { describe, expect, it } from 'vitest';
import { JWT } from '../src/jwt';
import { JWTPayload } from 'jose';

describe('JWT', () => {
	describe('constructor', () => {
		it('should create a valid JWT with basic properties', () => {
			const jwt = new JWT('test', [], 'testissuer');
			const payload = jwt.payloadRaw(1000000);
			expect(payload).toBeDefined();
			expect(payload.iss).toBe('testissuer');
			expect(payload.sub).toBe('test');
			expect(payload.claims).toBeDefined();
			expect(payload.claims).toHaveLength(0);
		});

		it('should create a JWT with claims', () => {
			const claims = ['claim1', 'claim2'];
			const jwt = new JWT('test', claims, 'testissuer');
			const payload = jwt.payloadRaw(1000000);
			expect(payload.claims).toEqual(claims);
		});

		it('should set correct audience', () => {
			const jwt = new JWT('test', [], 'testissuer');
			const payload = jwt.payloadRaw(1000000);
			expect(payload.aud).toBe('catalyst:system:datachannels');
		});
	});

	describe('header', () => {
		it('should generate correct header with algorithm', () => {
			const jwt = new JWT('test', [], 'testissuer');
			const header = jwt.header('RS256');
			const decoded = JSON.parse(atob(header));
			expect(decoded).toEqual({
				alg: 'RS256',
				type: 'JWT',
			});
		});
	});

	describe('payload', () => {
		it('should generate payload with correct timestamps', () => {
			const jwt = new JWT('test', [], 'testissuer');
			const expiry = 3600; // 1 hour in seconds
			const payload = jwt.payloadRaw(expiry);

			const now = Math.floor(Date.now() / 1000);
			expect(payload.nbf).toBeLessThanOrEqual(now);
			expect(payload.iat).toBeLessThanOrEqual(now);
			expect(payload.exp).toBeGreaterThan(now);
			expect(payload.exp - payload.iat).toBe(Math.floor(expiry / 1000));
		});

		it('should generate base64url encoded payload', () => {
			const jwt = new JWT('test', [], 'testissuer');
			const encoded = jwt.payload('testkey', 3600);
			expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/); // base64url pattern
		});
	});

	describe('fromJOSEJWT', () => {
		it('should convert JOSE payload to JWT instance', () => {
			const josePayload: JWTPayload = {
				iss: 'testissuer',
				sub: 'testsubject',
				claims: ['claim1', 'claim2'],
				aud: 'catalyst:system:datachannels',
				jti: 'test-jti',
				nbf: 1000,
				iat: 1001,
				exp: 2000,
			};

			const jwt = JWT.fromJOSEJWT(josePayload);
			expect(jwt.iss).toBe(josePayload.iss);
			expect(jwt.sub).toBe(josePayload.sub);
			expect(jwt.claims).toEqual(josePayload.claims);
			expect(jwt.aud).toBe(josePayload.aud);
			expect(jwt.jti).toBe(josePayload.jti);
			expect(jwt.nbf).toBe(josePayload.nbf);
			expect(jwt.iat).toBe(josePayload.iat);
			expect(jwt.exp).toBe(josePayload.exp);
		});

		it('should handle missing optional fields', () => {
			const josePayload: JWTPayload = {
				iss: 'testissuer',
				sub: 'testsubject',
				claims: [],
				aud: 'catalyst:system:datachannels',
				jti: 'test-jti',
			};

			const jwt = JWT.fromJOSEJWT(josePayload);
			expect(jwt.iss).toBe(josePayload.iss);
			expect(jwt.sub).toBe(josePayload.sub);
			expect(jwt.claims).toEqual([]);
			expect(jwt.aud).toBe(josePayload.aud);
			expect(jwt.jti).toBe(josePayload.jti);
		});
	});
});
