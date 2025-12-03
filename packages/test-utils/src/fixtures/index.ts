/**
 * @catalyst/test-utils/fixtures
 *
 * Shared test fixtures and utilities extracted from worker tests
 * Provides common test data, mock handlers, and helper functions
 */

// User fixtures
export { TEST_ORG_ID, validUsers, getOrgId, type UserFixture } from './users.js';

// Mock handlers
export { createMockGraphqlEndpoint } from './mock-handlers.js';

// Test helpers
export { isWithinRange, assertSuccess, assertValid } from './test-helpers.js';

// Data generators
export { generateDataChannels, generateDataChannel } from './data-generators.js';

// AuthZed helpers (integration tests only)
export {
    clearAllAuthzedRoles,
    cleanupDataChannels,
    custodianCreatesDataChannel,
    type AuthzedServiceMinimal,
    type RegistrarServiceMinimal,
    type AuthzedTestEnv,
    type RegistrarTestEnv,
    type FullTestEnv,
} from './authzed-helpers.js';
