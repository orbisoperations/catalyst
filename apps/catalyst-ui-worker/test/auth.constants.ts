/**
 * Shared Auth Constants for E2E Testing
 *
 * Single source of truth for test user configurations and auth file paths.
 * Used by both auth.setup.ts and fixtures/auth.ts.
 */

import { UserRole } from '@catalyst/schemas';

/**
 * Extended user type for cross-org testing
 * Includes standard UserRole plus additional test users
 */
export type ExtendedUserType = UserRole | 'org-admin-beta';

/**
 * User configuration structure
 */
export interface TestUserConfig {
    email: string;
    org: string;
    roles: Record<string, Record<string, string>>;
    isPlatformAdmin: boolean;
    isAdmin: boolean;
}

/**
 * Test user configurations
 * These match the mock-user-credentials-cache worker expectations
 */
export const TEST_USERS: Record<UserRole, TestUserConfig> = {
    'platform-admin': {
        email: 'test-platform-admin@example.com',
        org: 'platform-org',
        roles: {
            'platform-admin': {
                'admin-role-name': 'platform-org',
            },
        },
        isPlatformAdmin: true,
        isAdmin: true,
    },
    'org-admin': {
        email: 'test-org-admin@example.com',
        org: 'test-org-alpha',
        roles: {
            'org-admin': {
                'admin-role-name': 'test-org-alpha',
            },
        },
        isPlatformAdmin: false,
        isAdmin: true,
    },
    'data-custodian': {
        email: 'test-data-custodian@example.com',
        org: 'test-org-alpha',
        roles: {
            'data-custodian': {
                'custodian-role-name': 'test-org-alpha',
            },
        },
        isPlatformAdmin: false,
        isAdmin: false,
    },
    'org-user': {
        email: 'test-org-user@example.com',
        org: 'test-org-alpha',
        roles: {
            'org-user': {
                'user-role-name': 'test-org-alpha',
            },
        },
        isPlatformAdmin: false,
        isAdmin: false,
    },
};

/**
 * Beta organization admin - for cross-org partnership workflow testing
 * This user belongs to test-org-beta and can accept invites from test-org-alpha
 */
export const TEST_USER_BETA: TestUserConfig = {
    email: 'test-org-admin-beta@example.com',
    org: 'test-org-beta',
    roles: {
        'org-admin': {
            'admin-role-name': 'test-org-beta',
        },
    },
    isPlatformAdmin: false,
    isAdmin: true,
};

/**
 * All test users including extended users for cross-org testing
 */
export const ALL_TEST_USERS: Record<ExtendedUserType, TestUserConfig> = {
    ...TEST_USERS,
    'org-admin-beta': TEST_USER_BETA,
};

/**
 * Auth state file paths
 * Must match playwright.config.ts AUTH_FILES
 */
export const AUTH_FILES: Record<ExtendedUserType, string> = {
    'platform-admin': '.auth/platform-admin.json',
    'org-admin': '.auth/org-admin.json',
    'data-custodian': '.auth/data-custodian.json',
    'org-user': '.auth/org-user.json',
    'org-admin-beta': '.auth/org-admin-beta.json',
};
