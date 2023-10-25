import axios from "axios"
import {Buffer} from "buffer"
import { isConstructorDeclaration } from "typescript"

export interface BasicAuthToken {
    access_token: string
    token_type: string
    expires_in: number
}

// Zitadel docs describing login - https://zitadel.com/docs/guides/integrate/client-credentials
export async function BasicAuth(endpoint: string, clientId: string, clientSecret: string): Promise<BasicAuthToken | undefined> {
    //const basicAuthValue = Buffer.from(encodeURIComponent(clientId) + ":" + encodeURIComponent(clientSecret)).toString("base64")
    const basicAuthValue = btoa(encodeURIComponent(clientId) + ":" + encodeURIComponent(clientSecret))
    
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

export interface TokenValidation {
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

export class ZitadelClient implements IZitadelClient {
	endpoint: string
	token: string
	constructor(endpoint: string, token: string) {
		this.endpoint = endpoint
        this.token = token
	}

    async validateTokenByIntrospection(token: string) {
        return ValidateTokenByIntrospection(this.endpoint, this.token, token)
    }
}

export interface IZitadelClient {
    validateTokenByIntrospection(token: string): Promise<TokenValidation | undefined> 
}