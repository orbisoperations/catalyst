# Data Channel Certifier Service

A dedicated Cloudflare Worker service for certifying and validating data channel endpoints in the Catalyst federated data grid. This service runs on a scheduled basis to ensure data channel endpoints remain accessible, compliant, and meet platform standards.

## Overview

The `data-channel-certifier` service is a stateless certification and validation execution engine that:

- Validates GraphQL endpoint connectivity and schema compliance
- Runs on a 15-minute cron schedule for continuous monitoring
- Updates validation status through the `data_channel_registrar` service
- Exposes an RPC-only surface (no public HTTP routes)
- Maintains fault isolation from storage services

## Architecture

### Service Separation

This service implements clean separation of concerns:

- **Validation Logic**: All validation execution happens in this service
- **Status Storage**: Validation results are stored via `data_channel_registrar`
- **Service Communication**: Uses Cloudflare service bindings for inter-service calls

### Dependencies

- `data_channel_registrar`: For channel data and status updates
- `authx_token_api`: For JWT token validation and generation
- `issued-jwt-registry`: For token validity checking

## Features

### Scheduled Validation

- Runs every 15 minutes via Cloudflare cron triggers
- Validates all enabled data channels automatically
- Provides comprehensive validation reports

### RPC-only Service Surface

- No public HTTP endpoints are exposed. The Worker is invoked via Cloudflare Service Bindings RPC.
- Scheduled validations run via cron.

### Validation Steps

1. **Authentication**: Obtains system JWT tokens for validation
2. **Connectivity**: Tests basic GraphQL endpoint connectivity
3. **Schema Validation**: Performs GraphQL introspection to validate schema
4. **Query Testing**: Tests essential queries (like `_sdl` for federation)
5. **Status Updates**: Reports results back to data channel registrar

## RPC Surface (MVP)

The Worker implements RPC methods via `WorkerEntrypoint`, invoked by callers with a service binding:

- `validateBulkChannels(): Promise<ValidationReport>`
- `validateChannel(channelId: string): Promise<ValidationResult>`

Example call from another Worker with binding `DATA_CHANNEL_CERTIFIER`:

```ts
await env.DATA_CHANNEL_CERTIFIER.validateBulkChannels();
await env.DATA_CHANNEL_CERTIFIER.validateChannel('channel-uuid');
```

## Validation Status Types

- `valid`: Channel passed all validation checks
- `invalid`: Channel failed validation but is reachable
- `error`: Channel validation encountered errors (network, auth, etc.)
- `pending`: Validation is in progress
- `unknown`: No validation has been performed yet

## Development

### Local Development

```bash
# Start development server
pnpm run dev

# Run tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# Lint code
pnpm run lint
```

### Deployment

```bash
# Deploy to preview
pnpm run deploy:preview

# Deploy to staging
pnpm run deploy:staging

# Deploy to production
pnpm run deploy:production
```

## Configuration

### Environment Variables

The service uses Cloudflare service bindings for configuration:

- `DATA_CHANNEL_REGISTRAR`: Binding to data channel registrar service
- `AUTHX_TOKEN_API`: Binding to JWT token API service
- `ISSUED_JWT_REGISTRY`: Binding to JWT registry service

### Cron Schedule

The service is configured to run every 15 minutes:

```json
"triggers": {
  "crons": ["*/15 * * * *"]
}
```

## Testing (MVP)

We use the Workers Vitest integration to run tests in a workerd-backed pool. For MVP we focus on unit tests of schemas and logic, with optional runtime tests added incrementally.

References: Cloudflare Vitest integration guide: https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/

Key points:

- Tests run without loading `wrangler.jsonc` to avoid real service bindings.
- The test pool is configured with `compatibilityDate` and no external services.
- Add test-only bindings in `vitest.config.ts` under `poolOptions.workers.miniflare.bindings` if needed.

Commands:

```bash
pnpm test
pnpm test:coverage
```

## Integration

### Service Bindings

The service communicates with other Catalyst services via Cloudflare service bindings:

```typescript
interface Env {
  DATA_CHANNEL_REGISTRAR: Fetcher;
  AUTHX_TOKEN_API: Fetcher;
  ISSUED_JWT_REGISTRY: Fetcher;
}
```

### API Contracts

#### Data Channel Certifier (RPC over Service Bindings)

Invoked by callers via the `DATA_CHANNEL_CERTIFIER` service binding. Methods are exposed by `WorkerEntrypoint`.

```ts
interface DataChannelCertifierRpc {
  validateBulkChannels(): Promise<ValidationReport>;
  validateChannel(channelId: string): Promise<ValidationResult>;
}

// Example usage from another Worker
await env.DATA_CHANNEL_CERTIFIER.validateBulkChannels();
await env.DATA_CHANNEL_CERTIFIER.validateChannel('channel-uuid');
```

Return types are defined in `src/schemas.ts`.

#### data_channel_registrar (RPC over Service Bindings)

Adapter Validation calls Registrar via RPC methods (no HTTP routes between services):

```ts
interface RegistrarRpc {
  getEnabledChannels(): Promise<DataChannel[]>;
  getChannelForValidation(channelId: string): Promise<DataChannel | null>;
  updateValidationStatus(
    channelId: string,
    validationResult: ValidationResult
  ): Promise<{ success: boolean }>;
}

// Example (from Data Channel Certifier)
const channels = await env.DATA_CHANNEL_REGISTRAR.getEnabledChannels();
const channel = await env.DATA_CHANNEL_REGISTRAR.getChannelForValidation('channel-uuid');
await env.DATA_CHANNEL_REGISTRAR.updateValidationStatus('channel-uuid', validationResult);
```

## Monitoring

### Logs

- TBD

### Metrics

Key metrics to monitor:

- TBD

## Security

### Token Management

- TBD

## Troubleshooting

- TBD
