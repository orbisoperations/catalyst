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

The AuthX AuthZed API provides comprehensive relationship-based authorization capabilities:

### User Management

- **Add/Remove Users**: Manage user membership in organizations with different roles
- **Role Management**: Support for User, Data Custodian, and Admin roles
- **User Listing**: Query users within organizations with optional role filtering

### Organization Management

- **Organization Membership**: Check if users are members of organizations
- **Partnership Management**: Create and manage partnerships between organizations
- **Permission Checks**: Verify user permissions for various organization operations

### Data Channel Authorization

- **Data Channel Association**: Link data channels to organizations
- **Access Control**: Manage which organizations can access specific data channels
- **Read Permissions**: Check if users can read from data channels (both direct and partner access)
- **CRUD Permissions**: Verify create, update, and delete permissions for data channels

### Permission System

- **Role-Based Access**: Different permission levels based on user roles
- **Relationship-Based**: Access determined by relationships between entities
- **Partnership Access**: Users can access partner organization resources
- **Fine-Grained Control**: Specific permissions for different operations

## Integration

This service is a critical component in the Catalyst security infrastructure.

Used by the following services:

- [AuthX Token API](../authx_token_api/README.md)
- [User Credentials Cache](../user-credentials-cache/README.md)
- [Organization Matchmaking](../organization_matchmaking/README.md)
- [Data Channel Registrar](../data_channel_registrar/README.md)
- [Data Channel Gateway](../data_channel_gateway/README.md)
- [Catalyst UI Worker](../catalyst-ui-worker/README.md)

## Development

### Configuration Changes

- The configuration for workers environment is `wrangler.jsonc` (JSON with comments). This new format allows for better structure and comment support. See `wrangler.jsonc` for all environment and deployment settings.

### Local Development Setup

1. **Environment Variables Setup**

   Copy the example environment file and configure it:

   ```bash
   cd apps/authx_authzed_api
   cp .dev.vars.example .dev.vars
   ```

   The `.dev.vars` file should contain:

   ```env
   AUTHZED_ENDPOINT="http://localhost:8449"
   AUTHZED_KEY="atoken"
   AUTHZED_PREFIX="orbisops_catalyst_dev/"
   ```

   > **Important**: Always copy `.dev.vars.example` to `.dev.vars` and update the values as needed for your local or remote AuthZed instance. The `.dev.vars` file is gitignored and contains your local configuration.

2. **Start AuthZed/SpiceDB Container**

   You can either:

   **Option A**: Use the root development script (recommended):

   ```bash
   # From the root catalyst directory
   ./run_local_dev.sh
   ```

   This automatically starts AuthZed along with all other services.

   **Option B**: Run AuthZed manually:

   ```bash
   # From the root catalyst directory
   podman run --rm \
     -v ./apps/authx_authzed_api/schema.zaml:/schema.zaml:ro \
     -p 8449:8443 \
     -p 50051:50051 \
     --detach \
     --name authzed-container \
     authzed/spicedb:latest \
     serve-testing \
     --http-enabled \
     --skip-release-check=true \
     --log-level debug \
     --load-configs ./schema.zaml
   ```

   **Port Mapping**:

   - `8449`: HTTP API endpoint (used by Catalyst services)
   - `50051`: gRPC endpoint (for `zed` CLI tool)

   > **Note**: For unit testing, AuthZed is automatically started by `global-setup.ts`. Manual startup is only needed for local development.

3. **Start the Worker Locally**

   ```bash
   cd apps/authx_authzed_api
   pnpm dev
   ```

   Or with specific environment and variables:

   ```bash
   npx wrangler dev --env preview --var-file .dev.vars
   ```

See the `wrangler.jsonc` file for more configuration options and environment-specific settings.

### Developing with ZED CLI for SpiceDB

`SpiceDB` is the open-source authorization database that powers `AuthZed`. Here's how to work with it effectively:

`authzed/zed` is the CLI tool for connecting via gRPC to a `SpiceDB`.

> [!NOTE]
> Install here [authzed/zed](https://github.com/authzed/zed)

---

> [!IMPORTANT]
> When testing locally with `serve-testing` the `SpiceDB` constainer will be in dev/insecure mode.
> To be able to execute operations against it with zed, every command must contain the `zed --insecure [...]` flag

1. **Schema Development**

   - The schema and default relationships (along with some valistions) are defined in `schema.zaml` in this directory
   - Use the [SpiceDB Playground](https://play.authzed.com/) to test and validate your schema changes
   - Key concepts to understand:
     - **Definitions**: Define your resource types and their relations
     - **Relations**: Define how resources relate to each other and to subjects
     - **Permissions**: Define computed permissions based on relations

2. **Schema Validation**

   - After making changes to `schema.zaml`, validate it using the `zed` CLI:

     ```sh
     zed validate schema.zaml
     ```

3. **Testing Relationships**

   - Use the `zed` CLI to test relationships:

     Instroscpect the schema on `SpiceDB`:

     ```sh
     # when running `serve-testing` to need to send token
     zed schema read --insecure
     ```

     Create new relationship:

     ```sh
     zed relationship create orbisops_catalyst_dev/organization:localorg data_custodian orbisops_catalyst_dev/user:myNewUser
     ```

     Query created relationship:

     ```sh
     zed relationship read orbisops_catalyst_dev/organization
     ```

4. **Common Development Patterns**

   - When adding new resources:
     1. Define the resource type in `schema.zaml`
     2. Add relations and permissions
     3. Update the `AuthzedClient` to support the new resource
     4. Add tests in `authzed-client.test.ts`
   - When modifying permissions:
     1. Update the schema
     2. Test the changes in the SpiceDB Playground
     3. Update any affected client code
     4. Add migration tests

5. **Debugging Tips**

   - Enable debug logging in SpiceDB with `--log-level trace`. Trace will print each request.
   - Use the SpiceDB CLI to inspect relationships:

     For making aure a proper schema is loaded

     ```sh
     zed schema read
     ```

   - Check the `SpiceDB` logs for detailed information about permission checks

## Testing

To run the tests for this service:

```sh
pnpm test
```

**Prerequisites:**

- [Podman](https://podman.io/docs/installation) must be installed on your system
- The tests automatically start an AuthZed container using Podman via the `global-setup.ts` script

If you encounter issues with container creation during tests, verify your Podman installation:

```sh
podman --version
```

## Deployment
