/**
 * Data generation utilities for tests
 *
 * These helpers create test data objects with sensible defaults
 * for use in both unit and integration tests.
 */

import type { DataChannel } from '@catalyst/schemas';
import { TEST_ORG_ID } from './users.js';

/**
 * Generate test data channels with sensible defaults
 *
 * @param count - Number of data channels to generate
 * @param overrides - Optional partial DataChannel to override defaults
 * @returns Array of DataChannel objects
 *
 * @example
 * ```ts
 * const channels = generateDataChannels(3);
 * const customChannels = generateDataChannels(2, { accessSwitch: false });
 * ```
 */
export function generateDataChannels(count = 1, overrides: Partial<DataChannel> = {}): DataChannel[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `dummy-id-${i}`,
        name: `Data Channel ${i}`,
        endpoint: `https://example.com/data${i}`,
        creatorOrganization: TEST_ORG_ID,
        accessSwitch: true,
        description: `This is a test data channel ${i}`,
        ...overrides,
    }));
}

/**
 * Generate a single test data channel
 *
 * @param overrides - Optional partial DataChannel to override defaults
 * @returns A single DataChannel object
 *
 * @example
 * ```ts
 * const channel = generateDataChannel();
 * const customChannel = generateDataChannel({ name: 'Custom Name' });
 * ```
 */
export function generateDataChannel(overrides: Partial<DataChannel> = {}): DataChannel {
    const [channel] = generateDataChannels(1, overrides);
    if (!channel) {
        throw new Error('Failed to generate data channel');
    }
    return channel;
}
