# Local Authzed + SpiceDB Setup

This directory contains everything you need to run a local Authzed/SpiceDB instance for development and testing.

## Quick Start

Run the setup script to automatically configure and start local Authzed:

```sh
# From the repo root:
bash scripts/local-authzed/setup-local-authzed.sh
```

The script will:

- Start Authzed/SpiceDB containers using the included compose file
- Load the schema from `apps/authx_authzed_api/schema.zaml`
- Prompt you for your email to grant local admin permissions
- Verify everything is working correctly

## ⚠️ Important Note

**For daily development, use `pnpm dev` which runs a lightweight SpiceDB container automatically. This script is for first-time onboarding with the full Authzed stack (Postgres, schema loading, user creation).**

## Stopping Containers

To stop the local Authzed containers:

```sh
docker compose -f scripts/local-authzed/docker-compose.authzed.yml down
# Or if using Podman:
# podman compose -f scripts/local-authzed/docker-compose.authzed.yml down
```

## Resetting Local Data

To completely reset the local Authzed instance (removes all data):

```sh
# Stop containers and remove volumes (resetting your local authzed schema/relationships)
docker compose -f scripts/local-authzed/docker-compose.authzed.yml down --volumes
# Or if using Podman:
# podman compose -f scripts/local-authzed/docker-compose.authzed.yml down --volumes

# Then run the setup script again
bash scripts/local-authzed/setup-local-authzed.sh
```

## Files

- `docker-compose.authzed.yml`: Compose file for Authzed/SpiceDB and dependencies
- `setup-local-authzed.sh`: Automated setup script that handles all container management
- `README.md`: This file

## Notes

- The setup script handles all container management automatically
- Designed for local development only
- Uses Docker by default (falls back to Podman automatically)
