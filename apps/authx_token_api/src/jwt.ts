import { v4 as uuidv4 } from 'uuid';
import base64url from "base64url";
import {JWTPayload} from "jose";
import { DEFAULT_STANDARD_DURATIONS } from '../../../packages/schema_zod';

/*
RFC 7519 (JWT)

NumericDate
      A JSON numeric value representing the number of seconds from
      1970-01-01T00:00:00Z UTC until the specified UTC date/time,
      ignoring leap seconds.  This is equivalent to the IEEE Std 1003.1,
      2013 Edition [POSIX.1] definition "Seconds Since the Epoch", in
      which each day is accounted for by exactly 86400 seconds, other
      than that non-integer values can be represented.  See RFC 3339
      [RFC3339] for details regarding date/times in general and UTC in
      particular.

 */

export interface DSSJWT {
    iss: string // issuer
    sub: string // subject
    aud: string // audience
    jti: string // jwt id
    nbf: number // not before
    exp: number // expiration
    iat: number // issued at
    claims: string[] // list of urns
}

export class JWT implements DSSJWT{
    iss: string // issuer
    sub: string // subject
    aud: string // audience
    jti: string // jwt id
    // @ts-ignore
    nbf: number // not before
    // @ts-ignore
    exp: number // expiration
    // @ts-ignore
    iat: number // issued at
    claims: string[] // list of urns

    constructor(entity: string, claims: string[], iss: string) {
        this.sub = entity;
        this.claims = claims;
        this.iss = iss;
        this.aud = `catalyst:system:datachannels`;
        this.jti = uuidv4();
        //this.nbf = new Date().getTime();
        //this.iat = new Date().getTime();
        //this.exp = new Date().getTime() + expiry;
    }

    header(alg: string) {
        return base64url(JSON.stringify({
            alg: alg,
            type: "JWT"
        }));
    }

    payload(keyURN:string, expiry: number) {
			const now = Date.now(); // in MS

			this.nbf = (Math.floor(now / DEFAULT_STANDARD_DURATIONS.S))-1; // in S
			this.iat = (Math.floor(now / DEFAULT_STANDARD_DURATIONS.S)); // in S
			this.exp = Math.floor((now  + expiry) / DEFAULT_STANDARD_DURATIONS.S); // in S
			return base64url(JSON.stringify({
					iss: keyURN,
					sub: this.sub,
					claims: this.claims,
					aud: this.aud,
					jti: this.jti,
					nbf: this.nbf,
					iat: this.iat,
					exp: this.exp,
			}));
    }

    payloadRaw(expiry: number) {
			const now = Date.now(); // in MS
			this.nbf = (Math.floor(now / DEFAULT_STANDARD_DURATIONS.S))-1; // in S
			this.iat = (Math.floor(now / DEFAULT_STANDARD_DURATIONS.S)); // in S
			this.exp = Math.floor((now  + expiry) / DEFAULT_STANDARD_DURATIONS.S); // in S
			return {
				iss: this.iss,
				sub: this.sub,
				claims: this.claims,
				aud: this.aud,
				jti: this.jti,
				nbf: this.nbf,
				iat: this.iat,
				exp: this.exp,
			};
    }

    static fromJOSEJWT(payload: JWTPayload): JWT {
        let jwt = {} as JWT;
        jwt.iss = payload.iss!;
        jwt.sub = payload.sub!;
        jwt.claims = payload.claims! as string[];
        jwt.aud = String(payload.aud!);
        jwt.jti = payload.jti!;
        jwt.nbf = payload.nbf!;
        jwt.iat = payload.iat!;
        jwt.exp = payload.exp!;

        return jwt
    }
}
