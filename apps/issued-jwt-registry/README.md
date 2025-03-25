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
- **Read**: Retrieve JWT registration details
- **List**: List all JWT registrations for an organization
- **Update Status**: Change JWT status (e.g., active, revoked)
- **Delete**: Mark a JWT as deleted

### Revocation System

- **Revocation List**: Maintain a list of revoked JWTs
- **Revocation Checks**: Verify if a JWT has been revoked
- **Manage Revocations**: Add/remove JWTs from the revocation list

### Security

- **Permission Checks**: All operations require valid user tokens
- **Organization Isolation**: Each organization can only access its own JWT registrations
- **Expiration Handling**: Automatic handling of JWT expiry


## Integration

The Issued JWT Registry integrates with the following services:

- [User Credentials Cache](../user_credentials_cache/README.md) - Provides user authentication and validation services. Used to:
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



