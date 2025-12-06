import { WorkerEntrypoint } from 'cloudflare:workers';

/**
 * Mock User Credentials Cache for E2E Tests
 *
 * This worker replaces the real user-credentials-cache and mock-identity-server
 * for Playwright E2E tests. It returns pre-configured mock users based on the
 * token provided, eliminating the need for real Cloudflare Access validation.
 *
 * Tokens follow the pattern: test-token-{userType}
 * where userType is one of: platform-admin, org-admin, data-custodian, org-user
 */

interface User {
    userId: string;
    orgId: string;
    zitadelRoles: string[];
}

/**
 * Mock users matching TEST_USERS in auth.ts fixtures
 * These return the same data that the real user-credentials-cache would return
 * after validating tokens against Cloudflare Access
 */
const MOCK_USERS: Record<string, User> = {
    'test-token-platform-admin': {
        userId: 'test-platform-admin@example.com',
        orgId: 'platform-org',
        zitadelRoles: ['platform-admin'],
    },
    'test-token-org-admin': {
        userId: 'test-org-admin@example.com',
        orgId: 'test-org-alpha',
        zitadelRoles: ['org-admin'],
    },
    'test-token-data-custodian': {
        userId: 'test-data-custodian@example.com',
        orgId: 'test-org-alpha',
        zitadelRoles: ['data-custodian'],
    },
    'test-token-org-user': {
        userId: 'test-org-user@example.com',
        orgId: 'test-org-alpha',
        zitadelRoles: ['org-user'],
    },
    // Beta organization admin - for cross-org partnership testing
    'test-token-org-admin-beta': {
        userId: 'test-org-admin-beta@example.com',
        orgId: 'test-org-beta',
        zitadelRoles: ['org-admin'],
    },
};

/**
 * Mock User Credentials Cache Worker
 *
 * Exposes the same RPC interface as the real user-credentials-cache worker
 * so other workers can call it transparently during E2E tests.
 */
export default class MockUserCredsCacheWorker extends WorkerEntrypoint {
    /**
     * Get user information from a mock token
     *
     * @param token - The mock token (e.g., 'test-token-data-custodian')
     * @returns User object or undefined if token not recognized
     */
    async getUser(token: string): Promise<User | undefined> {
        console.log(`[mock-user-credentials-cache] getUser called with token: ${token.substring(0, 20)}...`);

        // Return mock user based on token
        const user = MOCK_USERS[token];

        if (user) {
            console.log(`[mock-user-credentials-cache] Returning mock user: ${user.userId} (${user.orgId})`);
            return user;
        }

        // For any other token, return a default test user
        // This handles cases where tests might use arbitrary tokens
        console.log('[mock-user-credentials-cache] Unknown token, returning default user');
        return {
            userId: 'default-test-user@example.com',
            orgId: 'test-org-alpha',
            zitadelRoles: ['org-user'],
        };
    }

    /**
     * HTTP fetch handler for health checks and debugging
     */
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Health check endpoint
        if (url.pathname === '/' || url.pathname === '/health') {
            return new Response(
                JSON.stringify({
                    status: 'ok',
                    service: 'mock-user-credentials-cache',
                    availableUsers: Object.keys(MOCK_USERS),
                }),
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        // Debug endpoint to list available mock users
        if (url.pathname === '/debug/users') {
            return new Response(JSON.stringify(MOCK_USERS, null, 2), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response('Not Found', { status: 404 });
    }
}
