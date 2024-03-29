import axios from "axios";
import {KeyLike, importSPKI, jwtVerify, JWTPayload} from "jose";

import {Client, fetchExchange, gql} from '@urql/core';

import {StatusCode} from "hono/utils/http-status"

export class UrlqGraphqlClient {

    client: Client;

    constructor(endpoint: string) {
        this.client = new Client({
            url: endpoint,
            exchanges: [fetchExchange],
            preferGetMethod: "within-url-limit",
        });
    }


    async getPublickKey(): Promise<string> {
        const query = gql`
            query {
                publicKey
            }
        `;

        const response = await this.client.query(query, {}).toPromise();

        return response.data.publicKey as string
    }
}
export class VerifyingClient {
    endpoint: string;
    publicKey: KeyLike | undefined = undefined;
    constructor(publicKeyEndpoint: string) {
        this.endpoint = publicKeyEndpoint;
    }

    async verify(token: string, issuer: string, claims: string[] ): Promise<[boolean, {msg: string, status: StatusCode}?]> {
        if (!this.publicKey) {
            const client = new UrlqGraphqlClient(this.endpoint)
            const pubKey = await client.getPublickKey()
            console.log(pubKey);
            this.publicKey = await importSPKI(pubKey, 'ES384');
        }

        console.log("verifying jwt");
        var jwtClaims: JWTPayload
        try {
            const { payload} = await jwtVerify(token, this.publicKey);
            jwtClaims = payload
        } catch (e) {
            console.error(e)
            return [false, {msg: "JWT Invalid", status: 401}]
        }

        /// check that the issuer is good
        if (jwtClaims.iss !== issuer) {
            console.log("jwt issuer is bunk")
            return [false, {msg: "JWT Issuer Invalid", status: 401}]
        }
        // check that claims exist, non-exists is falsey, empty array can be true
        if (!("claims" in jwtClaims)) {
            console.log("jwt claims non-existent")
            return [false, {msg: "JWT Claims Missing", status: 401}]
        }

        const dataChannelClaims: string[] = jwtClaims["claims"] as string[]
        // check that our claims are in the claims
        if (claims.filter(e => dataChannelClaims.includes(e)).length != claims.length) {
            return [false, {msg: "JWT Claims Do Not Align", status: 401}]
        }

        return [true]
    }
}

type Token = string
export type JWTError = {
    msg: string
    status: StatusCode
}

export function GradTokenInHeader(authHeader: string | undefined): Token | JWTError {
    // authheader should be in format "Bearer tokenstring"
    if (!authHeader) {
        return {
                msg: "No Credenetials Supplied",
                status: 400
            }
    }

    const  headerElems = authHeader.split(" ")
    if (headerElems.length != 2) {
        return {
                msg: "No Credenetials Supplied",
                status: 400
            }
    }

    return headerElems[1]
}
