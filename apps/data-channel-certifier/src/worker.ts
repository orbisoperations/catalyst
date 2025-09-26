import { WorkerEntrypoint } from 'cloudflare:workers';
import { ValidationEngine, ValidationRequest } from './validation-engine';
import { ValidationResult, ValidationReport } from './schemas';

/**
 * Data Channel Certifier Service
 *
 * Dedicated service for certifying and validating data channel endpoints.
 * Runs on 15-minute cron schedule to certify all accessible data channels.
 * Updates certification status through data_channel_registrar service.
 */
export default class DataChannelCertifierWorker extends WorkerEntrypoint<Env> {
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
      // Get all registered data channels from the registrar
      const channels = await this.env.DATA_CHANNEL_REGISTRAR.list();

      if (!channels || channels.length === 0) {
        console.log('[DataChannelCertifier] No channels found to validate');
        return;
      }

      console.log(`[DataChannelCertifier] Validating ${channels.length} channels`);

      // Validate all channels
      const results = await this.validateBulkChannels(channels);

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
    const validationEngine = new ValidationEngine(this.env);
    const results: ValidationResult[] = [];

    try {
      // If no channels provided, get from registrar
      if (!channels) {
        const registrarChannels = await this.env.DATA_CHANNEL_REGISTRAR.list();
        channels = registrarChannels || [];
      }

      // Validate each channel in parallel with controlled concurrency
      const validationPromises = channels.map(async (channel) => {
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
    } catch (error) {
      console.error('[DataChannelCertifier] Bulk validation error:', error);
    }

    // Calculate summary statistics
    const validChannels = results.filter((r) => r.status === 'valid').length;
    const invalidChannels = results.filter((r) => r.status === 'invalid').length;
    const errorChannels = results.filter((r) => r.status === 'error').length;

    return {
      timestamp: startTime,
      totalChannels: channels.length,
      validChannels,
      invalidChannels,
      errorChannels,
      results,
    };
  }

  /**
   * RPC method: Validate a single channel
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
        },
      };
    }
  }
}
