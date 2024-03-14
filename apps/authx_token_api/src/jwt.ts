import {localServer as localHander} from "./in_memory";
import { v4 as uuidv4 } from 'uuid';
import base64url from "base64url";
import axios from "axios";
import {KeyLike, importSPKI, jwtVerify, JWTPayload} from "jose";


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
    nbf: number // not before
    exp: number // expiration
    iat: number // issued at
    claims: string[] // list of urns
    constructor(entity: string, claims: string[], iss: string) {
        this.sub = entity;
        this.claims = claims;
        this.iss = iss;
        this.aud = `sdd:hub:network:gateway`;
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
        this.nbf = new Date().getTime() / 1000; //seconds
        this.iat = new Date().getTime() / 1000; //seconds
        this.exp = (new Date().getTime() / 1000 ) + expiry; //seconds
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
        this.nbf = new Date().getTime() / 1000; //seconds
        this.iat = new Date().getTime() / 1000; //seconds
        this.exp = (new Date().getTime() / 1000 ) + expiry; //seconds
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
export interface AssymetricJWTSigner {
    sign(jwt: JWT, expiresIn?: number): Promise<{token: string}>
}

export interface AssymetricJWTVerifier {
    getPublicKey(): Promise<string>
}

export interface JWTSigningRequest {
    entity: string
    claims: string[]
    expiresIn?: number
}

export class SigningClient {
    endpoint: string;

    constructor(signingEndpoint: string) {
        this.endpoint = signingEndpoint;
    }

    async sendRequest(request: JWTSigningRequest): Promise<{token:string}> {
        return (await axios.put(this.endpoint, request)).data
    }
}

export class VerifyingClient {
    endpoint: string;
    publicKey: KeyLike | undefined = undefined;
    constructor(publicKeyEndpoint: string) {
        this.endpoint = publicKeyEndpoint;
    }

    async verify(token: string): Promise<JWT | undefined> {
        if (!this.publicKey) {
            const response = await axios.get(`${this.endpoint}`);
            console.log(response.data);
            this.publicKey = await importSPKI(response.data, 'ES384');
        }

        console.log("verifying jwt");
        const { payload, protectedHeader } = await jwtVerify(token, this.publicKey);
        return JWT.fromJOSEJWT(payload);
    }
}

export const handler = lambdaHandler;
export const localServer = localHander;

export const servers = {
    awsLambda: lambdaHandler,
    localInMemory: localServer
}