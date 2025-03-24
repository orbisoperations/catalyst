# Data Channel Registrar

A Cloudflare Workers-based service for managing the registration and lifecycle of data channels within the Catalyst project. This service provides a central registry for tracking data channels and managing access permissions.

## Purpose

The Data Channel Registrar serves as the central repository for data channel management in the Catalyst ecosystem, offering:

- Registration and discovery of data channels
- Permission-based access control for data channels
- Organization-based data channel ownership
- Integration with authentication and authorization services
- Ability to enable/disable data channel access

## Architecture

This service is built using:

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Serverless execution environment
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) - For persistent storage of data channel registrations
- TypeScript - For type-safe implementation

The application is structured around two main components:

1. `RegistrarWorker` - The entry point class that handles requests and permissions
2. `Registrar` - A Durable Object that provides persistent storage and data management

## Features

### Data Channel Management

- **Create**: Register new data channels with metadata
- **Read**: Retrieve data channel details
- **Update**: Modify data channel properties
- **Delete**: Remove data channels
- **List**: Discover available data channels based on permissions

### Permission Management

- **CUD Permissions**: Create, Update, Delete permissions for data channels
- **Read Permissions**: Access control for reading data channel information
- **Organization Isolation**: Data channels are owned by organizations
- **JWT-based Access**: Support for JWT token-based access to data channels. Provides access to external organizations who do not own the data channel. This access can only be coordinated via invitation from the owning organization to the invited external organization

# Integration 

This service is a critical component in the Catalyst ecosystem:

- Used by the Data Channel Gateway to discover available data channels
- Integrates with AuthX services for authentication and authorization
- Enforces organization boundaries and access controls
- Provides consistent data channel information across the platform

### Data Isolation
- Data channels are owned by specific organizations
- Users can only access data channels they have permission for
- JWT tokens must explicitly include data channel claims