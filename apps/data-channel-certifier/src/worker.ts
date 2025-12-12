import { WorkerEntrypoint } from 'cloudflare:workers';
import type { ComplianceReport, ComplianceResult, ComplianceRequest } from '@catalyst/schemas';
import { ComplianceEngine } from './compliance-engine';

/**
 * Data Channel Certifier Service
 *
 * Dedicated service for certifying and checking compliance of data channel endpoints.
 * Runs on 15-minute cron schedule to check compliance of all accessible data channels.
 * Updates compliance status through data_channel_registrar service.
 *
 * RPC API Surface:
 * - checkBulkCompliance(): Check compliance of multiple channels (exposed via RPC)
 * - checkCompliance(): Check compliance of a single channel (exposed via RPC)
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
     * Cron trigger handler - runs compliance checks on schedule
     *
     * ⚠️ NOT an RPC method - automatically invoked by Cloudflare's cron scheduler
     * Configured in wrangler.jsonc with 15-minute intervals (every 15 minutes)
     *
     * This method checks compliance of all enabled data channels on a 15-minute schedule
     * and updates their compliance status in the registrar.
     */
    async scheduled(): Promise<void> {
        console.log('[DataChannelCertifier] Starting scheduled compliance check run');

        try {
            // Get only enabled data channels from the registrar
            const enabledChannels = await this.env.DATA_CHANNEL_REGISTRAR.listAll('default', true);

            if (!enabledChannels || enabledChannels.length === 0) {
                console.log('[DataChannelCertifier] No enabled channels to check');
                return;
            }

            console.log(`[DataChannelCertifier] Checking compliance of ${enabledChannels.length} enabled channels`);

            // Check compliance of only enabled channels
            const results = await this.checkBulkCompliance(enabledChannels);

            console.log(`[DataChannelCertifier] Compliance check complete:`, {
                total: results.totalChannels,
                compliant: results.compliantChannels,
                nonCompliant: results.nonCompliantChannels,
                errors: results.errorChannels,
            });
        } catch (error) {
            console.error('[DataChannelCertifier] Scheduled compliance check failed:', error);
        }
    }

    /**
     * RPC API: Check compliance of all enabled channels (bulk compliance check)
     *
     * Can be called from other workers via service binding:
     * ```typescript
     * const report = await env.DATA_CHANNEL_CERTIFIER.checkBulkCompliance(channels);
     * ```
     *
     * @param channels - Optional array of channels to check. If not provided, fetches all enabled channels from registrar
     * @returns ComplianceReport with summary statistics and individual compliance results
     *
     * @throws {Error} Standard Error types propagate (message + name), but stack traces do not cross RPC boundary
     *
     * Implementation notes:
     * - Checks channels in parallel with controlled concurrency
     * - Uses Promise.allSettled to handle partial failures gracefully
     * - Returns summary even if individual checks fail
     */
    async checkBulkCompliance(
        channels?: Array<{ id: string; endpoint: string; creatorOrganization: string }>
    ): Promise<ComplianceReport> {
        const startTime = Date.now();
        const complianceEngine = new ComplianceEngine(this.env);
        const results: ComplianceResult[] = [];

        try {
            // Resolve channels to a definite array
            const channelsToCheck = channels ?? (await this.env.DATA_CHANNEL_REGISTRAR.listAll('default', true)) ?? [];

            // Check each channel in parallel with controlled concurrency
            const compliancePromises = channelsToCheck.map(async (channel) => {
                const request: ComplianceRequest = {
                    channelId: channel.id,
                    endpoint: channel.endpoint,
                    organizationId: channel.creatorOrganization,
                };

                return complianceEngine.checkChannelCompliance(request);
            });

            // Use Promise.allSettled to handle partial failures
            const settledResults = await Promise.allSettled(compliancePromises);

            for (const result of settledResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    console.error('[DataChannelCertifier] Channel compliance check failed:', result.reason);
                }
            }

            // Calculate summary statistics
            const compliantChannels = results.filter((r) => r.status === 'compliant').length;
            const nonCompliantChannels = results.filter((r) => r.status === 'non_compliant').length;
            const errorChannels = results.filter((r) => r.status === 'error').length;

            return {
                timestamp: startTime,
                totalChannels: channelsToCheck.length,
                compliantChannels,
                nonCompliantChannels,
                errorChannels,
                results,
            };
        } catch (error) {
            console.error('[DataChannelCertifier] Bulk compliance check error:', error);
            return {
                timestamp: startTime,
                totalChannels: 0,
                compliantChannels: 0,
                nonCompliantChannels: 0,
                errorChannels: 0,
                results: [],
            };
        }
    }

    /**
     * RPC API: Check compliance of a single channel
     *
     * Can be called from other workers via service binding:
     * ```typescript
     * const result = await env.DATA_CHANNEL_CERTIFIER.checkCompliance({
     *   channelId: 'channel-123',
     *   endpoint: 'https://example.com/graphql',
     *   organizationId: 'org-456'
     * });
     * ```
     *
     * @param request - Compliance request with channel details
     * @returns ComplianceResult indicating compliant/non_compliant/error status
     *
     * @throws {Error} Standard Error types propagate (message + name), but stack traces do not cross RPC boundary
     *
     * Implementation notes:
     * - Performs authentication compliance tests (valid token, invalid token, no token)
     * - Future: Could automatically disable non-compliant channels
     * - Returns structured error details for debugging
     */
    async checkCompliance(request: ComplianceRequest): Promise<ComplianceResult> {
        const complianceEngine = new ComplianceEngine(this.env);

        try {
            // Check the channel's compliance
            const result = await complianceEngine.checkChannelCompliance(request);

            // Optionally update the channel status in the registrar
            // This could be used to disable non-compliant channels
            if (result.status === 'non_compliant' || result.status === 'error') {
                console.warn(
                    `[DataChannelCertifier] Channel ${request.channelId} compliance check failed:`,
                    result.error || 'Non-compliant'
                );
                // Future: Could update channel access switch here
                // await this.env.DATA_CHANNEL_REGISTRAR.updateAccessSwitch(request.channelId, false);
            }

            return result;
        } catch (error) {
            console.error(`[DataChannelCertifier] Error checking compliance for channel ${request.channelId}:`, error);
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
