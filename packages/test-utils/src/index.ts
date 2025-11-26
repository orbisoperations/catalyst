/**
 * @catalyst/test-utils
 *
 * Shared utilities for testing across Catalyst apps
 */

export { isSpiceDBRunning, waitForSpiceDB, detectContainerRuntime, stopSpiceDBContainer } from './spicedb-health.js';
export {
    STANDARD_COMPATIBILITY_DATE,
    STANDARD_COMPATIBILITY_FLAGS,
    STANDARD_TEST_PATTERNS,
    STANDARD_COVERAGE_CONFIG,
    STANDARD_AUTHZED_BINDINGS,
    createStandardWorkerConfig,
} from './vitest-config.js';
