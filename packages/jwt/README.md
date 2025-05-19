# JWT Validation Package

This data channel uses JWT validation to ensure secure access to airplane data. The following table outlines the validation checks performed on each JWT token and the corresponding error messages when validation fails.

## JWT Validation Cases

| Error Code                        | Case                        | Check                                                   | Error Message                                                |
| --------------------------------- | --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `JWKS_PROVIDER_URL_REQUIRED`      | Missing JWKS Provider URL   | `jwksProviderUrl` parameter is required                 | "JWKS Provider URL is required"                              |
| `CATALYST_TOKEN_REQUIRED`         | Missing JWT Token           | `jwtToken` parameter is required                        | "Token is required"                                          |
| `JWKS_ERROR_FETCHING`             | JWKS Fetching Error         | Failed to fetch or create JWKS                          | "Error fetching JWKS"                                        |
| `JWT_VALIDATION_FAILED`           | JWT Validation Failed       | Token signature or standard claims validation failed    | Error message from JWT library                               |
| `UNEXPECTED_JWT_VALIDATION_ERROR` | Unexpected Validation Error | Any unexpected error during JWT verification            | "Unexpected Error Verifying JWT: {error}"                    |
| `JWT_ISSUER_INVALID`              | Invalid Issuer              | Token issuer doesn't match expected issuer              | "JWT Issuer Invalid"                                         |
| `JWT_CLAIMS_MISSING`              | Missing Claims              | Token doesn't contain required claims field             | "JWT Data Channel Claims Missing"                            |
| `JWT_CLAIMS_DO_NOT_ALIGN`         | Claims Mismatch             | Token claims don't include the required data channel ID | "JWT Data Channel Claims Does not contain current ChannelId" |

## Key Functions

### grabTokenInHeader

Extracts a JWT token from the Authorization header.

```typescript
function grabTokenInHeader(
    authHeader: string | undefined
): [string, { msg: string; status: ContentfulStatusCode } | null];
```

- **Input**: Authorization header string in format "Bearer {token}"
- **Output**: A tuple containing:
    - The extracted token (if successful)
    - Error details (if extraction fails) or null (if successful)
- **Error Cases**:
    - Missing Authorization header
    - Improperly formatted Authorization header

### verifyJwtWithRemoteJwks

Verifies a JWT token using a remote JWKS provider.

```typescript
async function verifyJwtWithRemoteJwks(
    jwtToken: string,
    issuer: string,
    dataChannelId: string,
    jwksProviderUrl: string
): Promise<JWTValidationResult>;
```

- **Parameters**:
    - `jwtToken`: The JWT token to verify
    - `issuer`: The expected issuer of the token
    - `dataChannelId`: The data channel ID that should be included in the token's claims
    - `jwksProviderUrl`: URL to the JWKS provider for signature verification
- **Returns**: A discriminated union result type with either:
    - Success: `{ verified: true, payload: JWTPayload }`
    - Error: `{ verified: false, errorCode: JWTValidationErrorType, message: string, jwtError?: object }`

## Usage Example

To ensure proper authentication, make sure your JWT token:

1. Is properly signed
2. Contains the correct issuer
3. Includes the data channel ID in its claims
4. Is verified against the proper JWKS endpoint

The JWT validation uses a discriminated union pattern for type-safe error handling, allowing consumers to easily determine if validation succeeded or failed and access appropriate data.
