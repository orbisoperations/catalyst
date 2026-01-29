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

Each channel undergoes the following validation tests:

1. **JWT Authentication Test**

   - Obtains system JWT token from `authx_token_api`
   - Tests endpoint with valid token (expects 200)
   - Tests endpoint with invalid token (expects 401/403)
   - Tests endpoint with no token (expects 401/403)
   - **All three tests must pass** for authentication validation

2. **GraphQL Introspection Test**

   - Sends authenticated introspection query
   - Validates response structure (200 status, valid GraphQL format)
   - Checks for `__schema` field and `queryType.name`
   - Ensures no GraphQL errors in response

3. **SDL Federation Test**
   - Sends authenticated `{ _sdl }` query (used by gateway for schema stitching)
   - Validates response structure (200 status, valid GraphQL format)
   - Checks for `_sdl` field containing a non-empty SDL string
   - Ensures no GraphQL errors in response

**All three tests must pass** for a channel to be certified as `valid`.

## RPC Surface (MVP)

The Worker implements RPC methods via `WorkerEntrypoint`, invoked by callers with a service binding:

- `validateBulkChannels(channels?: Array<...>): Promise<ValidationReport>`

  - Validates multiple channels (all enabled channels if not specified)
  - Returns summary report with individual results
  - **Note**: Currently validates all channels concurrently without throttling

- `validateChannel(request: ValidationRequest): Promise<ValidationResult>`
  - Validates a single channel
  - Returns detailed validation result

Example call from another Worker with binding `DATA_CHANNEL_CERTIFIER`:

```ts
// Validate all enabled channels
await env.DATA_CHANNEL_CERTIFIER.validateBulkChannels();

// Validate specific channel
await env.DATA_CHANNEL_CERTIFIER.validateChannel({
  channelId: 'channel-uuid',
  endpoint: 'https://example.com/graphql',
  organizationId: 'org-uuid',
});
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

## Performance Considerations

### Bulk Validation Concurrency

**Current Behavior**: The `validateBulkChannels()` method validates all channels **concurrently** without throttling.

**Implications**:

- ✅ **Fast**: All validations run in parallel for quick results
- ⚠️ **Resource Usage**: Memory and network connections scale with channel count
- ⚠️ **Rate Limiting**: May trigger rate limits with hundreds of channels
- ⚠️ **CPU/Memory**: Could overwhelm worker resources at scale

**Recommended Limits**:

- **Small deployments** (< 50 channels): Current implementation works well
- **Medium deployments** (50-200 channels): Monitor resource usage
- **Large deployments** (> 200 channels): Consider implementing batching

**Future Improvement**: Planned enhancement to add configurable concurrency limits:

```typescript
// Future API (not yet implemented)
validateBulkChannels(channels, { concurrencyLimit: 10 });
```

### Timeouts

- **Network Timeout**: 10 seconds per fetch request (hardcoded)
- **Validation Timeout**: No overall timeout (controlled by individual fetch timeouts)
- **Future**: Make timeouts configurable via environment variables

### Memory Usage

Each validation creates:

- 1 system JWT token request
- 5 fetch requests (3 for JWT tests + 1 for introspection + 1 for SDL)
- Multiple promise objects held in memory until completion

Estimated memory per channel: ~1-2 KB during validation

## Monitoring

### Logs

The service provides structured logging at each validation step:

```typescript
// Log patterns to monitor
'[ValidationEngine] Starting validation for channel';
'[ValidationEngine:JWT] JWT test completed';
'[ValidationEngine:Introspection] Introspection test completed';
'[DataChannelCertifier] Validation complete';
```

### Metrics

Key metrics to monitor:

**Performance**:

- `validation_duration_ms`: Time to validate a single channel
- `bulk_validation_duration_ms`: Time to validate all channels
- `concurrent_validations`: Number of simultaneous validations

**Success Rates**:

- `channels_valid`: Channels passing all tests
- `channels_invalid`: Channels failing validation
- `channels_error`: Channels with validation errors

**Resource Usage**:

- `memory_usage_mb`: Worker memory consumption during bulk validation
- `cpu_time_ms`: CPU time per validation

**Alerts to Configure**:

- Bulk validation duration > 60 seconds (may indicate concurrency issues)
- Error rate > 10% (indicates systemic issues)
- Individual validation timeout rate > 5% (network issues)

## Troubleshooting

### Common Issues

**Bulk Validation Times Out**

- **Symptom**: Validation runs exceed worker CPU limits
- **Cause**: Too many concurrent validations
- **Solution**: Reduce channel count or implement batching
- **Workaround**: Call `validateChannel()` individually with delays

**High Memory Usage**

- **Symptom**: Worker OOM errors during bulk validation
- **Cause**: All validation promises held in memory simultaneously
- **Solution**: Limit number of channels validated per invocation
- **Metrics**: Monitor `memory_usage_mb` metric

**Validation Timeouts**

- **Symptom**: Channels marked as `error` due to timeout
- **Cause**: Slow data channel endpoints (> 10s response time)
- **Solution**: Currently no configuration available (hardcoded 10s timeout)
- **Future**: Will be configurable via environment variables

**Rate Limiting**

- **Symptom**: Validations fail with rate limit errors
- **Cause**: Too many concurrent requests to the same endpoint
- **Solution**: Implement request throttling or increase rate limits
- **Workaround**: Reduce validation frequency in cron schedule
