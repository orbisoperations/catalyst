import { DEFAULT_STANDARD_DURATIONS } from '@catalyst/schema_zod';
import { env } from 'cloudflare:test';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';
describe('jwt integration tests', () => {
    it('can get the public key', async () => {
        const jwtDoId = env.JWT_TOKEN_DO.idFromName('default');
        const jwtStub = env.JWT_TOKEN_DO.get(jwtDoId);
        const pkey = await jwtStub.getPublicKey();
        expect(pkey).toBeDefined();
        expect(pkey).toBeTypeOf('object');
        expect(pkey.pem).toBeTypeOf('string');
    });
    it('can rotate the key', async () => {
        const jwtDoId = env.JWT_TOKEN_DO.idFromName('default');
        const jwtStub = env.JWT_TOKEN_DO.get(jwtDoId);
        const pkey1 = await jwtStub.getPublicKey();
        expect(pkey1).toBeDefined();
        expect(pkey1).toBeTypeOf('object');
        expect(pkey1.pem).toBeTypeOf('string');

        expect(await jwtStub.rotateKey()).toBeTruthy();
        const pkey2 = await jwtStub.getPublicKey();
        expect(pkey2).toBeDefined();
        expect(pkey2).toBeTypeOf('object');
        expect(pkey2.pem).toBeTypeOf('string');

        expect(pkey1.pem).not.toBe(pkey2.pem);
    });
    it('can sign and verify a jwt', async () => {
        const jwtRequest = {
            entity: 'testuser',
            claims: ['testclaim'],
        };
        const jwtDoId = env.JWT_TOKEN_DO.idFromName('newtest');
        const jwtStub = env.JWT_TOKEN_DO.get(jwtDoId);
        const jwtToken = await jwtStub.signJWT(
            jwtRequest,
            360 * DEFAULT_STANDARD_DURATIONS.S,
            'catalyst:system:datachannels'
        );
        expect(jwtToken.expiration).toBeCloseTo(Date.now() + 360 * DEFAULT_STANDARD_DURATIONS.S, -4);

        const validateResp = await jwtStub.validateToken(jwtToken.token);

        expect(validateResp.claims[0]).toBe('testclaim');
        expect(validateResp.valid).toBeTruthy();
        expect(validateResp.entity).toBe('testuser');

        const invalid = await jwtStub.validateToken(jwtToken.token + 'makebad');
        expect(invalid.valid).toBeFalsy();
    });

    it('can use jwks', async () => {
        const jwtDoId = env.JWT_TOKEN_DO.idFromName('default');
        const jwtStub = env.JWT_TOKEN_DO.get(jwtDoId);
        const jwk = await jwtStub.getJWKS();

        expect(jwk).toBeDefined();
        const jwtRequest = {
            entity: 'testuser',
            claims: ['testclaim'],
        };
        const jwtToken = await jwtStub.signJWT(
            jwtRequest,
            360 * DEFAULT_STANDARD_DURATIONS.S,
            'catalyst:system:datachannels'
        );

        const jwkPub = await createLocalJWKSet(jwk);

        await jwtVerify(jwtToken.token, jwkPub, {
            issuer: 'catalyst:system:jwt:latest',
            audience: 'catalyst:system:datachannels',
        });
    });
    it('expired token does not validate', async () => {
        const jwtRequest = {
            entity: 'testuser',
            claims: ['testclaim'],
        };
        const jwtDoId = env.JWT_TOKEN_DO.idFromName('newtest');
        const jwtStub = env.JWT_TOKEN_DO.get(jwtDoId);
        const jwtToken = await jwtStub.signJWT(
            jwtRequest,
            -6 * DEFAULT_STANDARD_DURATIONS.M,
            'catalyst:system:datachannels'
        );
        // wait for token to expire

        expect(jwtStub.validateToken);
        const validateResp = await jwtStub.validateToken(jwtToken.token);

        expect(validateResp.valid).toBeFalsy();
    });
});
