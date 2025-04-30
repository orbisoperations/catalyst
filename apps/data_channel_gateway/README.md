# Data Channel Gateway

A GraphQL gateway service for the Catalyst project that dynamically federates and stitches together GraphQL schemas from various data channels. This service provides a unified API entry point with authentication, authorization, and schema stitching capabilities.

## Purpose

The Data Channel Gateway serves as the centralized access point for GraphQL APIs within the Catalyst ecosystem, offering:

- A unified GraphQL endpoint for all data channels
- JWT-based authentication and authorization
- Dynamic schema stitching and federation
- Token validation and revocation checking
- Secure routing to registered data channels

## Architecture

This service is built using:

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Serverless execution environment
- [Hono](https://hono.dev/) - Lightweight web framework
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) - GraphQL server
- [GraphQL Tools](https://the-guild.dev/graphql/tools) - For schema stitching and federation
- TypeScript - For type-safe implementation

## Features


### GraphQL Federation

- **Dynamic Schema Stitching**: Combines multiple GraphQL schemas into a single unified API
- **Remote Schema Fetching**: Retrieves schemas from registered data channels


## Integration

The Data Channel Gateway integrates with the following services:

- [Data Channel Registrar](../data_channel_registrar/README.md) - Provides data channel registration and discovery
- [AuthX]() - Provides authentication and authorization services
- [User Credentials Cache](../user-credentials-cache/README.md) - Provides user credentials cache services
- [AuthX AuthZed API]() - Provides authorization services
- [AuthX Token API]() - Provides token validation services

## Development

```
pnpm install
pnpm run dev
```


## Deployment

```
pnpm run deploy
```


