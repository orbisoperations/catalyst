# Catalyst Data Channel TAK Example

## Overview

This project demonstrates how to integrate a Cloudflare Worker with multiple TAK (Tactical Assault Kit) servers using GraphQL for data retrieval and dissemination. The worker periodically queries data from a central Catalyst Gateway and forwards it to TAK servers. Three environments (`staging`, `staging2`, and `tak3`) are configured, each with dedicated TAK servers but sharing the same Catalyst Gateway.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Environments](#environments)
3. [Setup](#setup)
4. [Configuration](#configuration)
5. [Durable Objects](#durable-objects)
6. [Scripts](#scripts)
7. [Development](#development)
8. [Deployment](#deployment)
9. [Environment Variables](#environment-variables)
10. [Additional Information](#additional-information)

## Project Structure

The project is organized as follows:

- **package.json**: Defines dependencies, scripts, and project metadata.
- **wrangler.toml**: Configuration file for Cloudflare Workers.
- **src/lib/**: Contains core logic for the Catalyst Gateway client and the task runner.
  - **catalyst-gateway-client.ts**: Manages interactions with the Catalyst Gateway.
  - **index.ts**: Contains utility functions and the task runner.
- **src/index.ts**: Entry point for the Cloudflare Worker.
- **.dev.vars.example**: Example environment variables file for local development.

## Environments

Three Cloudflare environments are defined, each targeting a unique TAK server but sharing the same Catalyst Gateway:

1. **Staging**

   - **TAK Server**: `https://tak-server-2-broken-haze-8097.fly.dev`
   - **Environment Variables**: `env.staging.vars`
   - **Routes**: `datachannel-tak-broken-haze.catalyst.devintelops.io`

2. **Staging2**

   - **TAK Server**: `https://goatak-empty-violet-5442.fly.dev`
   - **Environment Variables**: `env.staging2.vars`
   - **Routes**: `datachannel-tak-empty-violet.catalyst.devintelops.io`

3. **Tak3**
   - **TAK Server**: `https://tak-server-3-night-shade-spring-grass-8642.fly.dev`
   - **Environment Variables**: `env.tak3.vars`
   - **Routes**: `tak3-adapter.catalyst.devintelops.io`

## Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Configure environment variables:**
   - Copy the `.dev.vars.example` to `.dev.vars`:
     ```bash
     cp .dev.vars.example .dev.vars
     ```
   - Update `.dev.vars` with the appropriate values.

## Configuration

### wrangler.toml

The `wrangler.toml` file is configured to manage different environments and their specific variables. The environments section defines variables and routes specific to each environment.

Example configuration for the staging environment:

```toml
[env.staging.vars]
TAK_HOST = "https://tak-server-2-broken-haze-8097.fly.dev"
TAK_PORT = 8999
TAK_UI = "https://tak-server-2-auth-proxy.fly.dev/"
ENABLED = "true"
NAMESPACE = "broken-haze"
CATALYST_GATEWAY_URL = "https://gateway.catalyst.devintelops.io/graphql"
CATALYST_DC_ID = "8a9c86ae-7ff2-4cca-9fe7-b72b54605c84"
TAK_USER = "user"
CATALYST_GATEWAY_TOKEN = "your-token"
```

## Durable Objects

### Purpose

In this project, the Durable Object `TAKDataManager` is used to manage state and coordinate tasks for the TAK integration. It handles state persistence and synchronization, ensuring that data retrieved from the Catalyst Gateway is accurately and efficiently disseminated to the TAK servers.

### State Managed

1. **Catalyst UUIDs (catalyst-uuids):**

   - **Type:** `Map<string, number>`
   - **Description:** Stores unique identifiers (UUIDs) of data points from the Catalyst Gateway with their expiration timestamps.
   - **Purpose:** Tracks processed data points to maintain freshness and prevent reprocessing.

2. **TAK UUIDs (tak-uuids):**
   - **Type:** `Array<{ uid: string, callsign: string, lat: number, lon: number, stale_time: string, type: string }>`
   - **Description:** Stores data points currently active on the TAK server, including their unique identifiers (UUIDs), positions, and expiration timestamps.
   - **Purpose:** Keeps a record of data points sent to the TAK server to ensure synchronization.

### How It Works

1. **Initialization and Alarm Handling:**

   - The Durable Object sets up an alarm to trigger data synchronization tasks.
   - It periodically fetches data from the Catalyst Gateway, updates its state, and sends data to the TAK servers.

2. **Fetching and Storing Data:**

   - The `runTask` function fetches data and processes it into CoT (Cursor on Target) events.
   - The Durable Object updates its state by purging expired data points and adding new ones.
   - It stores the updated state in persistent storage.

3. **Synchronizing with TAK Servers:**
   - Fetches current data points from the TAK server.
   - Ensures that only unique, active data points are stored and synchronized.
   - Sends updated data points to the TAK server to maintain consistency.

### Key Functions

- **alarmInit:** Enables or disables the alarm for periodic tasks.
- **alarm:** Triggered by the alarm to perform data synchronization.
- **getTAKPoints:** Retrieves stored TAK points from the Durable Object's storage.

## Scripts

- **Deployment:**

  - Deploy to staging:
    ```bash
    pnpm run deploymentStaging
    ```
  - Deploy to demo:
    ```bash
    pnpm run deploymentDemo
    ```
  - Deploy to tak3:
    ```bash
    pnpm run deploymentTak3
    ```

- **Development:**
  - Start development server:
    ```bash
    pnpm run dev
    ```
  - Trigger scheduled task locally:
    ```bash
    pnpm run triggerScheduled
    ```

## Development

To start the development server and test the worker locally:

1. **Start the development server:**

   ```bash
   pnpm run dev
   ```

2. **Access the development server:**
   Open your browser and navigate to `http://localhost:4005`.

## Deployment

Deploy the worker to different environments using the scripts defined in `package.json`:

- **Staging:**

  ```bash
  pnpm run deploymentStaging
  ```

- **Demo:**

  ```bash
  pnpm run deploymentDemo
  ```

- **Tak3:**
  ```bash
  pnpm run deploymentTak3
  ```

## Environment Variables

To properly configure and run the project, several environment variables must be set. Below is a list of the variables defined in the `wrangler.toml` file and their descriptions:

### Staging Environment Variables

```toml
[env.staging.vars]
TAK_HOST = "https://tak-server-2-broken-haze-8097.fly.dev"
TAK_PORT = 8999
TAK_UI = "https://tak-server-2-auth-proxy.fly.dev/"
ENABLED = "true"
NAMESPACE = "broken-haze"
CATALYST_GATEWAY_URL = "https://gateway.catalyst.devintelops.io/graphql"
CATALYST_DC_ID = "8a9c86ae-7ff2-4cca-9fe7-b72b54605c84"
TAK_USER = "user"
#CATALYST_GATEWAY_TOKEN = "set in .dev.vars or on a remote deployment only"
```

- **TAK_HOST**: The URL of the TAK server.
- **TAK_PORT**: The port on which the TAK server is running.
- **TAK_UI**: The URL of the TAK server's authentication proxy.
- **ENABLED**: A flag to enable or disable the worker.
- **NAMESPACE**: The namespace for the TAK server instance.
- **CATALYST_GATEWAY_URL**: The URL of the Catalyst Gateway GraphQL endpoint.
- **CATALYST_DC_ID**: The unique identifier for the Catalyst data channel.
- **TAK_USER**: The username for the TAK server authentication.
- **CATALYST_GATEWAY_TOKEN**: The token used to authenticate with the Catalyst Gateway.

### Detailed Explanation of `CATALYST_GATEWAY_TOKEN`

The `CATALYST_GATEWAY_TOKEN` is a critical environment variable used for authenticating requests to the Catalyst Gateway. This token should be kept secure and never exposed in the codebase.

- **Purpose:** The token is included in the `Authorization` header of requests to ensure that only authorized clients can access the Catalyst Gateway's resources.
- **Configuration:** Set this variable in the web-ui for deployment environments, and in the `.dev.vars` file for local development.

Example:

```shell
CATALYST_GATEWAY_TOKEN="your-token"
```

## Additional Information

- **Data Flow:**

  - The worker queries the Catalyst Gateway for data.
  - The queried data is processed and sent to the respective TAK server.
  - Data includes aircraft positions, earthquake events, line events, and TAK-specific markers.

- **Environment Variables:**
  - Ensure all necessary environment variables are set in the `.dev.vars

` file for local development.

- The production and staging environments will use variables defined in the `wrangler.toml` file when --keep-vars is not specified during deployment
