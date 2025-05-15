import { KeyLike, importSPKI, jwtVerify, JWTPayload, createRemoteJWKSet } from 'jose';
import { JOSEError } from 'jose/errors';
import { Client, fetchExchange, gql } from '@urql/core';
import { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status';
import { z } from 'zod';

export class UrlqGraphqlClient {
    client: Client;

    constructor(endpoint: string) {
        this.client = new Client({
            url: endpoint,
            exchanges: [fetchExchange],
            preferGetMethod: 'within-url-limit',
        });
    }

    async getPublickKey(): Promise<string> {
        const query = gql`
            query {
                publicKey
            }
        `;

        const response = await this.client.query(query, {}).toPromise();

        return response.data.publicKey as string;
    }
}
export class VerifyingClient {
    endpoint: string;
    publicKey: KeyLike | undefined = undefined;
    constructor(publicKeyEndpoint: string) {
        this.endpoint = publicKeyEndpoint;
    }

    async verify(
        token: string,
        issuer: string,
        claims: string[]
    ): Promise<[boolean, { msg: string; status: StatusCode }?]> {
        if (!this.publicKey) {
            const client = new UrlqGraphqlClient(this.endpoint);
            const pubKey = await client.getPublickKey();
            // console.log(pubKey);
            this.publicKey = await importSPKI(pubKey, 'ES384');
        }

        // console.log("verifying jwt");
        let jwtClaims: JWTPayload;
        try {
            const { payload } = await jwtVerify(token, this.publicKey);
            jwtClaims = payload;
        } catch (e) {
            console.error(e);
            return [false, { msg: 'JWT Invalid', status: 401 }];
        }

        /// check that the issuer is good
        if (jwtClaims.iss !== issuer) {
            console.log('jwt issuer is bunk');
            return [false, { msg: 'JWT Issuer Invalid', status: 401 }];
        }
        // check that claims exist, non-exists is falsey, empty array can be true
        if (!('claims' in jwtClaims)) {
            console.log('jwt claims non-existent');
            return [false, { msg: 'JWT Claims Missing', status: 401 }];
        }

        const dataChannelClaims: string[] = jwtClaims['claims'] as string[];
        // check that our claims are in the claims
        if (claims.filter((e) => dataChannelClaims.includes(e)).length != claims.length) {
            return [false, { msg: 'JWT Claims Do Not Align', status: 401 }];
        }

        return [true];
    }
}

export type Token = string;

export type JWTError = {
    msg: string;
    status: ContentfulStatusCode;
};

export function grabTokenInHeader(
    authHeader: string | undefined
): [string, { msg: string; status: ContentfulStatusCode } | null] {
    // authheader should be in format "Bearer tokenstring"
    if (!authHeader) {
        return [
            '',
            {
                msg: 'No Credenetials Supplied',
                status: 400,
            },
        ];
    }

    const headerElems = authHeader.split(' ');
    if (headerElems.length != 2) {
        return [
            '',
            {
                msg: 'No Credenetials Supplied',
                status: 400,
            },
        ];
    }

    return [headerElems[1], null];
}

export type JWTValidationErrorType =
    | 'JWKS_PROVIDER_URL_REQUIRED'
    | 'CATALYST_TOKEN_REQUIRED'
    | 'JWT_VALIDATION_FAILED'
    | 'JWKS_ERROR_FETCHING'
    | 'JWT_ISSUER_INVALID'
    | 'JWT_CLAIMS_MISSING'
    | 'JWT_CLAIMS_DO_NOT_ALIGN'
    | 'UNEXPECTED_JWT_VALIDATION_ERROR';

export const JWTValidationErrorTypeEnum: z.ZodType<JWTValidationErrorType> = z.enum([
    'JWKS_PROVIDER_URL_REQUIRED',
    'CATALYST_TOKEN_REQUIRED',
    'JWT_VALIDATION_FAILED',
    'JWKS_ERROR_FETCHING',
    'JWT_ISSUER_INVALID',
    'JWT_CLAIMS_MISSING',
    'JWT_CLAIMS_DO_NOT_ALIGN',
    'UNEXPECTED_JWT_VALIDATION_ERROR',
]);

export const JWTValidationError = z.object({
    verified: z.literal(false),
    errorCode: JWTValidationErrorTypeEnum,
    message: z.string(),
    jwtError: z
        .object({
            code: z.string(),
            name: z.string(),
            message: z.string(),
        })
        .optional(),
});

export const JWTValidationSuccess = z.object({
    verified: z.literal(true),
    payload: z.custom<JWTPayload>(),
});

export const JWTValidationResultScheme = z.discriminatedUnion('verified', [JWTValidationSuccess, JWTValidationError]);
export type JWTValidationResult = z.infer<typeof JWTValidationResultScheme>;

/**
 * Verifies a JWT token with a JWKS provider
 *
 * Considerations:
 * - Requires a valid JWKS provider URL to fetch the public keys
 * - Token must have the correct issuer claim that matches the expected issuer
 * - Token must contain the specified dataChannelId in its claims
 * - JWKS fetching errors are handled and reported in the return object
 * - Returns detailed error information to help diagnose validation failures
 *
 * @param jwtToken - The JWT token to verify
 * @param issuer - The issuer of the JWT token
 * @param dataChannelId - The data channel ID to verify
 * @param jwksProviderUrl - The URL of the JWKS provider
 * @returns { error: JWTValidationError | null; verified: boolean; payload: JWTPayload | null }
 */
export async function verifyJwtWithRemoteJwks(
    jwtToken: string,
    issuer: string,
    dataChannelId: string,
    jwksProviderUrl: string
): Promise<JWTValidationResult> {
    if (!jwksProviderUrl) {
        return {
            errorCode: 'JWKS_PROVIDER_URL_REQUIRED',
            message: 'JWKS Provider URL is required',
            verified: false,
        };
    }

    if (!jwtToken) {
        return {
            errorCode: 'CATALYST_TOKEN_REQUIRED',
            message: 'Token is required',
            verified: false,
        };
    }

    const JWKS = createRemoteJWKSet(new URL(jwksProviderUrl));

    if (!JWKS) {
        return {
            errorCode: 'JWKS_ERROR_FETCHING',
            message: 'Error fetching JWKS',
            verified: false,
        };
    }

    let payload: JWTPayload | null = null;
    try {
        const verificationResult = await jwtVerify(jwtToken, JWKS);
        payload = verificationResult.payload;
    } catch (e) {
        if (e instanceof JOSEError) {
            console.error('error verifying token with JWKS', e);
            return {
                errorCode: 'JWT_VALIDATION_FAILED',
                message: e.message,
                jwtError: {
                    code: e.code,
                    name: e.name,
                    message: e.message,
                },
                verified: false,
            };
        } else {
            return {
                errorCode: 'UNEXPECTED_JWT_VALIDATION_ERROR',
                message: `Unexpected Error Verifying JWT: ${e}`,
                verified: false,
            };
        }
    }

    /// check that the issuer is good
    if (payload.iss !== issuer) {
        console.log('jwt issuer is not expected');
        return {
            errorCode: 'JWT_ISSUER_INVALID',
            message: 'JWT Issuer Invalid',
            verified: false,
        };
    }
    // check that claims exist, non-exists is falsey, empty array can be true
    if (!payload.claims) {
        console.log('jwt claims non-existent');
        return {
            errorCode: 'JWT_CLAIMS_MISSING',
            message: 'JWT Data Channel Claims Missing',
            verified: false,
        };
    }

    // check that our claims are in the claims
    const dataChannelClaims: string[] = payload.claims as string[];
    if (!dataChannelClaims.includes(dataChannelId)) {
        return {
            errorCode: 'JWT_CLAIMS_DO_NOT_ALIGN',
            message: `JWT Data Channel Claims Does not caontain current ChannelId`,
            verified: false,
        };
    }

    return {
        verified: true,
        payload,
    };
}
