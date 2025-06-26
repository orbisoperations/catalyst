# Local Authzed + SpiceDB Setup

This directory contains everything you need to run a local Authzed/SpiceDB instance for development and testing.

## Quick Start

Run the setup script to automatically configure and start local Authzed:

```sh
# From the repo root:
node scripts/local-authzed/setup-local-authzed.ts
```

The script will:

- Start Authzed/SpiceDB containers using the included compose file
- Load the schema from `apps/authx_authzed_api/schema.zaml`
- Prompt you for your email to grant local admin permissions
- Verify everything is working correctly

**Note:** This script is typically launched automatically by the `./run_local_dev.sh` script as part of the local development setup.

## Stopping Containers

To stop the local Authzed containers:

```sh
podman compose -f scripts/local-authzed/docker-compose.authzed.yml down
```

## Resetting Local Data

To completely reset the local Authzed instance (removes all data):

```sh
# Stop containers and remove volumes
podman compose -f scripts/local-authzed/docker-compose.authzed.yml down --volumes

# Then run the setup script again
node scripts/local-authzed/setup-local-authzed.ts
```

## Files

- `docker-compose.authzed.yml`: Compose file for Authzed/SpiceDB and dependencies
- `setup-local-authzed.ts`: Automated setup script that handles all container management
- `README.md`: This file

## Notes

- The setup script handles all container management automatically
- Designed for local development only
- Uses Podman by default (Docker also works)
