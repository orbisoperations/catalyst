# AuthX AuthZed API

A Cloudflare Workers-based service that provides a centralized Relationship-based Authorization system for the Catalyst project using.


## Purpose
The AuthX AuthZed API serves as the authorization layer for the Catalyst ecosystem providing relationship-based access control.

## Architecture

This service is built using:

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Serverless execution environment
- [AuthZed](https://authzed.com/) - Relationship-based authorization system
- [TypeScript](https://www.typescriptlang.org/) - For type-safe implementation

The application is structured around two main components:

1. `AuthzedWorker` - The entry point class that provides authorization methods for other services
2. `AuthzedClient` - A client implementation for interacting with the AuthZed API
3. `AuthzedUtils` - Utility functions for constructing and parsing AuthZed requests and responses

## Features


## Integration

This service is a critical component in the Catalyst security infrastructure.

Used by the following services:


- [AuthX Token API](../authx_token_api/README.md)
- [User Credentials Cache](../user_credentials_cache/README.md) 
- [Organization Matchmaking](../organization_matchmaking/README.md)
- [Data Channel Registrar](../data_channel_registrar/README.md)
- [Data Channel Gateway](../data_channel_gateway/README.md)
- [Catalyst UI](../catalyst-ui/README.md)
- [AuthX Token API](../authx_token_api/README.md)


## Development


## Testing


## Deployment
