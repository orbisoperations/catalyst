/**
 * Mock USERCACHE service for unit tests
 *
 * This mock simulates the user-credentials-cache service behavior
 * without requiring the actual service binding or container compilation.
 *
 * For unit tests, we want fast, isolated tests that don't depend on
 * external services. The mock returns undefined for any token, which
 * triggers the authentication failure path in RPerms().
 */

import { WorkerEntrypoint } from 'cloudflare:workers';

/**
 * Mock UserCache Worker that always returns undefined
 * This triggers authentication failures in unit tests
 */
export default class MockUserCacheWorker extends WorkerEntrypoint {
	/**
	 * Mock getUser - always returns undefined to trigger auth failures
	 * Unit tests verify error handling, not successful auth flows
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async getUser(_cfToken) {
		// Unit tests use invalid tokens, so always return undefined
		// This triggers the authentication failure path in RPerms()
		return undefined;
	}
}
