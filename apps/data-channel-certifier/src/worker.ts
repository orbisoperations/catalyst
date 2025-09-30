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
      // Get all registered data channels from the registrar
      const resp = await this.env.DATA_CHANNEL_REGISTRAR.list('default', { cfToken: undefined });
      let channels:
        | {
            id: string;
            accessSwitch: boolean;
            name: string;
            endpoint: string;
            description: string;
            creatorOrganization: string;
          }
        | {
            id: string;
            accessSwitch: boolean;
            name: string;
            endpoint: string;
            description: string;
            creatorOrganization: string;
          }[] = [];
      if (resp.success) {
        channels = Array.isArray(resp.data) ? resp.data : [resp.data];
      }

      if (!resp || channels?.length === 0) {
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
    const validationEngine = new ValidationEngine(this.env as unknown as ValidationEnv);
    const results: ValidationResult[] = [];

    try {
      // If no channels provided, get from registrar
      if (!channels) {
        const resp = await this.env.DATA_CHANNEL_REGISTRAR.list('default', { cfToken: undefined });

        channels = resp.success ? (Array.isArray(resp.data) ? resp.data : [resp.data]) : [];
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
      totalChannels: channels?.length || 0,
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
