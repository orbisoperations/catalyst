/**
 * Mock USERCACHE service for gateway integration tests
 *
 * This mock simulates the user-credentials-cache service behavior
 * for integration tests where we need valid user data.
 */

import { WorkerEntrypoint } from 'cloudflare:workers';

const TEST_ORG_ID = 'test_org';

// Mock user database matching test tokens
const validUsers = {
    'cf-test-token': {
        email: 'test_user@mail.com',
        userId: 'test_user@mail.com',
        orgId: TEST_ORG_ID,
        zitadelRoles: ['data-custodian'], // Required by User schema
        custom: {
            'urn:zitadel:iam:org:project:roles': {
                'data-custodian': {
                    '1234567890098765432': `${TEST_ORG_ID}.provider.io`,
                },
            },
        },
    },
};

/**
 * Mock UserCache Worker that returns test user data
 */
export default class MockUserCacheWorker extends WorkerEntrypoint {
    /**
     * Mock getUser - returns test user data for valid tokens
     */
    async getUser(cfToken) {
        // Return mock user if token exists, otherwise undefined
        return validUsers[cfToken] || undefined;
    }
}
