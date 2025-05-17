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
- [User Credentials Cache](../user-credentials-cache/README.md)
- [Organization Matchmaking](../organization_matchmaking/README.md)
- [Data Channel Registrar](../data_channel_registrar/README.md)
- [Data Channel Gateway](../data_channel_gateway/README.md)
- [Catalyst UI](../catalyst-ui/README.md)
- [AuthX Token API](../authx_token_api/README.md)

## Development

### Configuration Changes

- The configuration for workers environment is `wrangler.jsonc` (JSON with comments). This new format allows for better structure and comment support. See `wrangler.jsonc` for all environment and deployment settings.

### Local Development Setup

1. **Environment Variables**

   - Local development uses a `.dev.vars` file in this directory. Example:

     ```env
     AUTHZED_ENDPOINT="http://localhost:8443"
     AUTHZED_KEY="atoken"
     AUTHZED_PREFIX="orbisops_catalyst_dev/"
     ```

   - Make sure to update these values as needed for your local or remote AuthZed instance.

2. **Running AuthZed Locally with Podman**

   - You can run a local AuthZed instance using Podman (or Docker). Example command:

     ```sh
     podman run --rm -v ./apps/authx_authzed_api/schema.zaml:/schema.zaml:ro -p 8443:8443 --detach --name authzed-container authzed/spicedb:latest serve-testing --http-enabled --skip-release-check=true --log-level trace --load-configs ./schema.zaml
     ```

     > [!IMPORTANT]
     > If want to use CLI tool [authzed/zed](https://github.com/authzed/zed), you need to expose also the port `50051` for `gRPC`.
     >
     > Add: `-p 50051:50051` to `podman` flags

     ***

     > [!NOTE]
     > By default the `authx_authzed_api` **CloudFlare Worker™** relies on the HTTP endpoint for connections with SpiceDB. The exposed `gRPC` port is necessary if local development with `authzed/zed` cli tool will be made.

   - This will start AuthZed on `localhost:8443` with an in-memory datastore and a pre-shared key matching the `.dev.vars` example above.
   - **Note:** For unit testing, starting AuthZed SpiceDB with Podman is already handled automatically by `global-setup.ts`. You only need to start it manually for local development outside of the test environment.

3. **Start the Worker Locally**

   - Use Wrangler to start the worker in local mode:

     ```sh
     npx wrangler dev --env preview --var-file .dev.vars
     ```

   - This will load your local environment variables and connect to the local AuthZed instance.

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
