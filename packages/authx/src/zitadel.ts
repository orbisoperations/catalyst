export interface BasicAuthToken {
    access_token: string
    token_type: string
    expires_in: number
}

// Zitadel docs describing login - https://zitadel.com/docs/guides/integrate/client-credentials
export async function BasicAuth(endpoint: string, clientId: string, clientSecret: string): Promise<BasicAuthToken | undefined> {
    console.info("requesting zitadel token:", clientId, clientSecret)

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

export async function BasicAuthAPI(endpoint: string, clientId: string, clientSecret: string): Promise<BasicAuthToken | undefined> {
    console.info("creating zitadel api token:", clientId, clientSecret)

    return {
        // do encoding for basic auith hereer
        access_token: btoa(encodeURIComponent(clientId) + ":" + encodeURIComponent(clientSecret)),
        token_type: "",
        expires_in: 0
    }
}

export interface TokenValidation extends Object {
    active: boolean
    aud?: string
    sub?: string
    client_id?: string
    exp?: number
    iat?: number
    iss?: string
    jti?: string
    nbf?: number
    scope?: string
    token_type?: string
    username?: string
    "urn:zitadel:iam:user:resourceowner:id": string
}

async function ValidateTokenByIntrospection(endpoint: string, clientToken: string, tokenToValidate: string, basicAuth?: boolean): Promise<TokenValidation | undefined>  {
    console.log(`validating token ${tokenToValidate} using token ${clientToken}`)
    const resp = await fetch(
        `${endpoint}/oauth/v2/introspect`,
        {
            method: "post",
            headers: {
                Authorization: basicAuth? `Basic ${clientToken}` : `Bearer ${clientToken}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                token: tokenToValidate
            })
            
        }
    )

    const validationResp = await resp.json()
    console.log('validation response: ', validationResp);

    if (!resp.ok) {
        return undefined
    }

    return validationResp as TokenValidation
}

export class ZitadelClient implements IZitadelClient {
	endpoint: string
	token: string
	constructor(endpoint: string, token: string) {
		this.endpoint = endpoint
        this.token = token
	}

    async validateTokenByIntrospection(token: string, basicAuth?: boolean) {
        return ValidateTokenByIntrospection(this.endpoint, this.token, token, basicAuth)
    }
}

export interface IZitadelClient {
    validateTokenByIntrospection(token: string, basicAuth?: boolean): Promise<TokenValidation | undefined> 
}