import axios from "axios"
import {Buffer} from "buffer"

export interface BasicAuthToken {
    access_token: string
    token_type: string
    expires_in: number
}

// Zitadel docs describing login - https://zitadel.com/docs/guides/integrate/client-credentials
export async function BasicAuth(endpoint: string, clientId: string, clientSecret: string): Promise<BasicAuthToken | undefined> {
    const basicAuthValue = Buffer.from(encodeURIComponent(clientId) + ":" + encodeURIComponent(clientSecret)).toString("base64")
    
    const { data, status } = await axios.post<BasicAuthToken>(
        endpoint,
        {
            "grant_type": "authorization_code",
            scope: 'openid profile email urn:zitadel:iam:org:project:id:zitadel:aud'
        },
        {
            headers: {
                Authorization: `Basic ${basicAuthValue}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
    )

    if (status == 401) {
        return undefined
    }

    return data
}

interface TokenValidation {
    active: boolean
    aud?: string
    client_id?: string
    exp?: number
    iat?: number
    iss?: string
    jti?: string
    nbf?: number
    scope?: string
    token_type?: string
    username?: string
}

async function ValidateTokenByIntrospection(endpoint: string, clientToken: string, tokenToValidate: string): Promise<TokenValidation | undefined>  {
    const {data, status} = await axios.post<TokenValidation>(
        endpoint,
        {
            token: tokenToValidate
        },
        {
            headers: {
                Authorization: `Bearer ${clientToken}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
    )

    if (status == 401) {
        return undefined
    }

    return data
}

export class ZitadelClient {
	clientId: string
	clientSecret: string
	endpoint: string
	token?: BasicAuthToken
	constructor(endpoint: string, clientId: string, clientSecret: string) {
		this.clientId = clientId
		this.clientSecret = clientSecret
		this.endpoint = endpoint
	}

	async get(): Promise<BasicAuthToken> {
		if (this.token) {
			return this.token!
		} else {
			const newToken = await BasicAuth(this.endpoint, this.clientId, this.clientSecret);
			if (newToken) {
				this.token = newToken!;
				return this.token!;
			}
		}
		throw new Error("Unable to access Zitadel")
	}
}