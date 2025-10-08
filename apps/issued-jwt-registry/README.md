# Issued JWT Registry

A Cloudflare Workers-based service for managing and tracking JWTs (JSON Web Tokens) within the Catalyst project. This service provides a secure registry to track, validate, and revoke issued JWTs.

## Table of Contents

- [Issued JWT Registry](#issued-jwt-registry)
  - [Table of Contents](#table-of-contents)
  - [Purpose](#purpose)
  - [Architecture](#architecture)
  - [Features](#features)
    - [JWT Management](#jwt-management)
    - [Revocation System](#revocation-system)
    - [Security](#security)
  - [Integration](#integration)
  - [Development](#development)
  - [Testing](#testing)
  - [Deployment](#deployment)

## Purpose

The Issued JWT Registry serves as a central repository for monitoring and managing JWT tokens throughout their lifecycle. It allows organizations to:

- Register new JWTs when issued
- Track JWT status (active, revoked, expired, deleted)
- Revoke compromised or no longer needed JWTs
- Check if a JWT is valid or has been revoked
- Manage JWT expiration and validity

## Architecture

This service is built using:

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Serverless execution environment
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) - For persistent state management and storage
- TypeScript - For type-safe implementation

The application is structured around two main components:

1. `IssuedJWTRegistryWorker` - The entry point class that handles permissions and routes requests
2. `I_JWT_Registry_DO` - A Durable Object that provides persistent storage and business logic

## Features

### JWT Management

- **Create**: Register new JWT tokens with metadata (name, description, claims, organization)
  - User-initiated: Requires authentication via `create()` method
  - System-initiated: Bypasses auth via `createSystem()` for authorized services only
- **Read**: Retrieve JWT registration details
  - Authenticated: Requires user token via `get()` method
  - Unauthenticated: Available via `getById()` for validation purposes
- **List**: List all JWT registrations for an organization
- **Update Status**: Change JWT status (e.g., active, revoked)
- **Delete**: Mark a JWT as deleted (**non-idempotent**, see Error Handling below)

### Revocation System

- **Revocation List**: Maintain a list of revoked JWTs
- **Revocation Checks**: Verify if a JWT has been revoked
- **Manage Revocations**: Add/remove JWTs from the revocation list

### Security

- **Permission Checks**: All operations require valid user tokens
- **Organization Isolation**: Each organization can only access its own JWT registrations
- **Expiration Handling**: Automatic handling of JWT expiry
- **System Token Authorization**: `createSystem()` only allows specific services (`authx_token_api`, `data_channel_certifier`)

### Error Handling

The delete operation is **non-idempotent** and provides explicit error feedback:

**Delete Behavior** (`delete()` method):

- **Success**: First deletion of an active/revoked token returns `true`
- **"Token already deleted"**: Thrown when attempting to delete a token that's already deleted (idempotency check)
- **"Token not found"**: Thrown when the JWT ID doesn't exist in the registry

**Best Practices**:

```typescript
try {
	const deleted = await registry.delete(token, jwtId);
	console.log('Token deleted successfully');
} catch (error) {
	if (error.message === 'Token already deleted') {
		// Handle double-delete attempt
		console.warn('Token was already deleted');
	} else if (error.message === 'Token not found') {
		// Handle non-existent token
		console.error('Token does not exist');
	} else {
		// Handle other errors
		console.error('Unexpected error:', error);
	}
}
```

**Token Validation** (`validateToken()` method):

- Returns `{ valid: false, reason: 'not_found' }` if token not in registry
- Returns `{ valid: false, reason: 'revoked' }` if token deleted or revoked
- Returns `{ valid: false, reason: 'expired' }` if token past expiry date
- Returns `{ valid: true, entry: IssuedJWTRegistry }` if token is active

## Integration

The Issued JWT Registry integrates with the following services:

- [User Credentials Cache](../user-credentials-cache/README.md) - Provides user authentication and validation services. Used to:
  - Verify user identity and permissions
  - Validate organization membership and access rights
  - Cache user credentials to improve performance and reduce external API calls
  - Ensure secure access control for JWT management operations

and is used by the following services:

- [Catalyst UI](../catalyst-ui/README.md) - Frontend interface that ses the JWT registry for token management operations
- [Data Channel Gateway](../data_channel_gateway/README.md) - Uses JWT registry for token validation and access control
- Other Catalyst services can access it via Workers bindings

## Development

## Testing

The service includes comprehensive tests to verify functionality:

- JWT creation and retrieval
- Status management
- Revocation list operations
- Permission checks
- Expiration handling

Run tests with: `pnpm test`

## Deployment
