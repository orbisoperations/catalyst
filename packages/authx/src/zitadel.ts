export interface BasicAuthToken {
    access_token: string
    token_type: string
    expires_in: number
}

// Zitadel docs describing login - https://zitadel.com/docs/guides/integrate/client-credentials
export async function BasicAuth(endpoint: string, clientId: string, clientSecret: string): Promise<BasicAuthToken | undefined> {
    console.info("requesting zitadel token")

    const resp = await fetch(
        `${endpoint}/oauth/v2/token`,
        {
            method: "post",
            body: new URLSearchParams({
                grant_type: "client_credentials",
                scope: 'openid profile urn:zitadel:iam:org:project:id:zitadel:aud',
                client_id: clientId,
                client_secret: clientSecret
            }),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            }
        }
    )

    const respBody: BasicAuthToken = await resp.json()

    console.info("response received", respBody)

    if (resp.ok != true) {
        console.error(`ziadel error w/ basic auth`)
        console.error(respBody)
        return undefined
    }

    return respBody
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
    const resp = await fetch(
        `${endpoint}/oauth/v2/introspect`,
        {
            headers: {
                Authorization: `Bearer ${clientToken}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: JSON.stringify({
                token: tokenToValidate
            })
        }
    )

    if (!resp.ok) {
        return undefined
    }

    return await resp.json() as TokenValidation
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