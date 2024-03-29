import axios from "axios";
import {KeyLike, importSPKI, jwtVerify, JWTPayload} from "jose";

import {Client, fetchExchange, gql} from '@urql/core';

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

    async verify(token: string): Promise<JWTPayload | undefined> {
        if (!this.publicKey) {
            const client = new UrlqGraphqlClient(this.endpoint)
            const pubKey = await client.getPublickKey()
            console.log(pubKey);
            this.publicKey = await importSPKI(pubKey, 'ES384');
        }

        console.log("verifying jwt");
        try {
            const {payload, protectedHeader} = await jwtVerify(token, this.publicKey);
            return payload
        } catch (e) {
            console.error(e)
            return undefined
        }
    }
}