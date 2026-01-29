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

export {
    createStandardTestConfig,
    createUnitTestConfig,
    createIntegrationTestConfig,
    createSimpleWorkerTestConfig,
    type DurableObjectBinding,
    type ServiceBinding,
    type AuxiliaryWorker,
    type TestProjectConfig,
    type StandardTestConfigOptions,
    type SimpleWorkerTestOptions,
} from './vitest-factories.js';

export { STANDARD_WORKERS, handleCloudflareAccessAuthServiceOutbound } from './worker-definitions.js';

// Test fixtures
export {
    TEST_ORG_ID,
    validUsers,
    getOrgId,
    createMockGraphqlEndpoint,
    isWithinRange,
    assertSuccess,
    assertValid,
    generateDataChannels,
    generateDataChannel,
    clearAllAuthzedRoles,
    cleanupDataChannels,
    custodianCreatesDataChannel,
    type UserFixture,
    type AuthzedServiceMinimal,
    type RegistrarServiceMinimal,
    type AuthzedTestEnv,
    type RegistrarTestEnv,
    type FullTestEnv,
} from './fixtures/index.js';
