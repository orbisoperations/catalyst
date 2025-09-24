import DataChannelRegistrarWorker from '@catalyst/data_channel_registrar/src/worker';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { ValidationReport, ValidationResult } from './schemas';
import { ValidationEngine, ValidationEnv, ValidationRequest } from './validation-engine';
import IssuedJWTRegistryWorker from '../../issued-jwt-registry/src';
import JWTWorker from '@catalyst/authx_token_api/src';
export { ValidationReport, ValidationResult };
/**
 * Data Channel Certifier Service
 *
 * Dedicated service for certifying and validating data channel endpoints.
 * Runs on 15-minute cron schedule to certify all accessible data channels.
 * Updates certification status through data_channel_registrar service.
 */
export interface DataChannelCertifierWorkerEnv {
  DATA_CHANNEL_REGISTRAR: Service<DataChannelRegistrarWorker>;
  AUTHX_TOKEN_API: Service<JWTWorker>;
  ISSUED_JWT_REGISTRY: Service<IssuedJWTRegistryWorker>;
}
export default class DataChannelCertifierWorker extends WorkerEntrypoint<DataChannelCertifierWorkerEnv> {
  /**
   * RPC-only: disable public HTTP endpoints
   */
  async fetch(): Promise<Response> {
    return new Response('Not Found', { status: 404 });
  }

  /**
   * Cron trigger handler - runs validation on schedule
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
   * RPC method: Validate all enabled channels (bulk validation)
   */
  async validateBulkChannels(
    channels?: Array<{ id: string; endpoint: string; creatorOrganization: string }>
  ): Promise<ValidationReport> {
    const startTime = Date.now();
    const validationEngine = new ValidationEngine(this.env as unknown as ValidationEnv);
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
   * RPC method: Validate a single channel
   */
  async validateChannel(request: ValidationRequest): Promise<ValidationResult> {
    const validationEngine = new ValidationEngine(this.env as unknown as ValidationEnv);

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
        },
      };
    }
  }
}
