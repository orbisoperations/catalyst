import { WorkerEntrypoint } from 'cloudflare:workers';
import type { ValidationReport, ValidationResult, ValidationRequest } from '@catalyst/schemas';
import { ValidationEngine } from './validation-engine';

/**
 * Data Channel Certifier Service
 *
 * Dedicated service for certifying and validating data channel endpoints.
 * Runs on 15-minute cron schedule to certify all accessible data channels.
 * Updates certification status through data_channel_registrar service.
 *
 * RPC API Surface:
 * - validateBulkChannels(): Validate multiple channels (exposed via RPC)
 * - validateChannel(): Validate a single channel (exposed via RPC)
 * - scheduled(): Cron handler (NOT an RPC method, invoked by Cloudflare scheduler)
 *
 * Note: This worker disables HTTP endpoints and operates solely via RPC and cron triggers.
 */
export default class DataChannelCertifierWorker extends WorkerEntrypoint<Env> {
  /**
   * HTTP fetch handler - disabled for RPC-only service
   *
   * This worker does not expose public HTTP endpoints. All functionality is
   * accessed via service bindings (RPC) or cron triggers.
   *
   * @returns 404 Not Found response
   */
  async fetch(): Promise<Response> {
    return new Response('Not Found', { status: 404 });
  }

  /**
   * Cron trigger handler - runs validation on schedule
   *
   * ⚠️ NOT an RPC method - automatically invoked by Cloudflare's cron scheduler
   * Configured in wrangler.jsonc with 15-minute intervals (every 15 minutes)
   *
   * This method validates all enabled data channels on a 15-minute schedule
   * and updates their validation status in the registrar.
   */
  async scheduled(): Promise<void> {
    console.log('[DataChannelCertifier] Starting scheduled validation run');

    try {
      // Get only enabled data channels from the registrar
      const enabledChannels = await this.env.DATA_CHANNEL_REGISTRAR.listAll('default', true);

      if (!enabledChannels || enabledChannels.length === 0) {
        console.log('[DataChannelCertifier] No enabled channels to validate');
        return;
      }

      console.log(`[DataChannelCertifier] Validating ${enabledChannels.length} enabled channels`);

      // Validate only enabled channels
      const results = await this.validateBulkChannels(enabledChannels);

      console.log(`[DataChannelCertifier] Validation complete:`, {
        total: results.totalChannels,
        valid: results.validChannels,
        invalid: results.invalidChannels,
        errors: results.errorChannels,
      });
    } catch (error) {
      console.error('[DataChannelCertifier] Scheduled validation failed:', error);
    }
  }

  /**
   * RPC API: Validate all enabled channels (bulk validation)
   *
   * Can be called from other workers via service binding:
   * ```typescript
   * const report = await env.DATA_CHANNEL_CERTIFIER.validateBulkChannels(channels);
   * ```
   *
   * @param channels - Optional array of channels to validate. If not provided, fetches all enabled channels from registrar
   * @returns ValidationReport with summary statistics and individual validation results
   *
   * @throws {Error} Standard Error types propagate (message + name), but stack traces do not cross RPC boundary
   *
   * Implementation notes:
   * - Validates channels in parallel with controlled concurrency
   * - Uses Promise.allSettled to handle partial failures gracefully
   * - Returns summary even if individual validations fail
   */
  async validateBulkChannels(
    channels?: Array<{ id: string; endpoint: string; creatorOrganization: string }>
  ): Promise<ValidationReport> {
    const startTime = Date.now();
    const validationEngine = new ValidationEngine(this.env);
    const results: ValidationResult[] = [];

    try {
      // Resolve channels to a definite array
      const channelsToValidate =
        channels ?? (await this.env.DATA_CHANNEL_REGISTRAR.listAll('default', true)) ?? [];

      // Validate each channel in parallel with controlled concurrency
      const validationPromises = channelsToValidate.map(async (channel) => {
        const request: ValidationRequest = {
          channelId: channel.id,
          endpoint: channel.endpoint,
          organizationId: channel.creatorOrganization,
        };

        return validationEngine.validateChannel(request);
      });

      // Use Promise.allSettled to handle partial failures
      const settledResults = await Promise.allSettled(validationPromises);

      for (const result of settledResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('[DataChannelCertifier] Channel validation failed:', result.reason);
        }
      }

      // Calculate summary statistics
      const validChannels = results.filter((r) => r.status === 'valid').length;
      const invalidChannels = results.filter((r) => r.status === 'invalid').length;
      const errorChannels = results.filter((r) => r.status === 'error').length;

      return {
        timestamp: startTime,
        totalChannels: channelsToValidate.length,
        validChannels,
        invalidChannels,
        errorChannels,
        results,
      };
    } catch (error) {
      console.error('[DataChannelCertifier] Bulk validation error:', error);
      return {
        timestamp: startTime,
        totalChannels: 0,
        validChannels: 0,
        invalidChannels: 0,
        errorChannels: 0,
        results: [],
      };
    }
  }

  /**
   * RPC API: Validate a single channel
   *
   * Can be called from other workers via service binding:
   * ```typescript
   * const result = await env.DATA_CHANNEL_CERTIFIER.validateChannel({
   *   channelId: 'channel-123',
   *   endpoint: 'https://example.com/graphql',
   *   organizationId: 'org-456'
   * });
   * ```
   *
   * @param request - Validation request with channel details
   * @returns ValidationResult indicating valid/invalid/error status
   *
   * @throws {Error} Standard Error types propagate (message + name), but stack traces do not cross RPC boundary
   *
   * Implementation notes:
   * - Performs JWT validation tests (valid token, invalid token, no token)
   * - Future: Could automatically disable non-compliant channels
   * - Returns structured error details for debugging
   */
  async validateChannel(request: ValidationRequest): Promise<ValidationResult> {
    const validationEngine = new ValidationEngine(this.env);

    try {
      // Validate the channel
      const result = await validationEngine.validateChannel(request);

      // Optionally update the channel status in the registrar
      // This could be used to disable non-compliant channels
      if (result.status === 'invalid' || result.status === 'error') {
        console.warn(
          `[DataChannelCertifier] Channel ${request.channelId} validation failed:`,
          result.error || 'Invalid'
        );
        // Future: Could update channel access switch here
        // await this.env.DATA_CHANNEL_REGISTRAR.updateAccessSwitch(request.channelId, false);
      }

      return result;
    } catch (error) {
      console.error(`[DataChannelCertifier] Error validating channel ${request.channelId}:`, error);
      return {
        channelId: request.channelId,
        status: 'error',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          endpoint: request.endpoint,
          organizationId: request.organizationId,
          duration: 0,
          tests: [],
        },
      };
    }
  }
}
