# User Credentials Cache

A Cloudflare Workers-based service for caching and validating user credentials within the Catalyst project. This service optimizes user authentication by securely caching user data and reducing repeated identity verification calls.

## Table of Contents

- [User Credentials Cache](#user-credentials-cache)
  - [Table of Contents](#table-of-contents)
  - [Purpose](#purpose)
  - [Architecture](#architecture)
  - [Features](#features)
  - [Integration](#integration)
  - [Development](#development)
  - [Testing](#testing)
  - [Deployment](#deployment)

## Purpose

The User Credentials Cache serves as an intermediate layer between Catalyst services and identity providers, offering:

- Efficient caching of validated user data
- User authentication against Cloudflare Access
- Validation of user identity and organization membership and user roles
- Automatic purging of outdated credentials

## Architecture

This service is built using:

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Serverless execution environment
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) - For persistent caching and state management
- TypeScript - For type-safe implementation

The application is structured around two main components:

1. `UserCredsCacheWorker` - The entry point class that handles requests and routes to the appropriate cache
2. `UserCredsCache` - A Durable Object that provides persistent storage and cache logic

## Features

## Integration

## Development

## Testing

## Deployment
