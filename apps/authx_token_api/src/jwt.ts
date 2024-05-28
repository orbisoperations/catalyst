import { v4 as uuidv4 } from 'uuid';
import base64url from "base64url";
import {JWTPayload} from "jose";


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
			const now = Math.floor(Date.now() / 1000);
        this.nbf = now;
        this.iat = now;
        this.exp = now + expiry;
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
				const now = Date.now();

        this.nbf = now;
        this.iat = now;
        this.exp = now  + expiry;
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
