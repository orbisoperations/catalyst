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

## Integration

This service is a critical component in the Catalyst ecosystem:

- Used by the Data Channel Gateway to discover available data channels
- Integrates with AuthX services for authentication and authorization
- Enforces organization boundaries and access controls
- Provides consistent data channel information across the platform

## Data Isolation

- Data channels are owned by specific organizations
- Users can only access data channels they have permission for
- JWT tokens must explicitly include data channel claims

---

## Testing Requirements

For running tests locally, **Podman** ([https://podman.io](https://podman.io)) must be installed on your machine. Podman is used to manage containers required for integration testing.

To run the tests, use:

```sh
pnpm test
```

For more details on the test environment setup, see [`global-setup.ts`](./global-setup.ts).

### Testing with Mocked Services

The test environment includes mocked services for:

1. **Cloudflare Access** - Authentication is simulated with predefined tokens and user profiles
2. **AuthZed** - Authorization service for permission checks

#### User Credentials for Testing

Tests utilize predefined user credentials with specific roles:

```typescript
// Example user token configuration from vitest.config.ts
// data format returned by cloudflare access
const validUsers = {
  'admin-cf-token': {
    id: btoa('test-user@email.com'),
    email: 'test-user@email.com',
    custom: {
      'urn:zitadel:iam:org:project:roles': {
        'data-custodian': {
          '1234567890098765432': 'localdevorg.provider.io',
        },
        // other roles...
      },
    },
  },
};
```

When writing integration tests, use these predefined credentials to authenticate requests:

```typescript
// Example from integration.spec.ts
const user = {
  org: 'localdevorg',
  email: 'test-user@email.com',
  token: 'admin-cf-token',
};

// Create a test data channel with auth token
const createResponse = await SELF.create('default1', dataChannel, {
  cfToken: user.token,
});
```

#### Local Development Environment

The testing configuration (`vitest.config.ts`) sets up a complete local development environment with:

- Mocked Cloudflare Workers and Durable Objects
- Simulated AuthX services (authx_authzed_api, authx_token_api)
- User credentials cache with mocked Cloudflare Access responses

This allows for comprehensive testing without external dependencies.
