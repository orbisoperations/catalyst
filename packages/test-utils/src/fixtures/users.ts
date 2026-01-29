/**
 * Shared test user fixtures for Cloudflare Access authentication
 * Used across multiple worker tests to simulate different user roles
 */

export const TEST_ORG_ID = 'localdevorg';

export interface UserFixture {
    email: string;
    custom: Record<string, Record<string, Record<string, string>>>;
}

/**
 * Valid test users with different roles for Cloudflare Access token simulation
 * Each key represents a CF Access token, and the value contains user info
 */
export const validUsers: Record<string, UserFixture> = {
    'cf-org-admin-token': {
        email: 'org-admin@email.com',
        custom: {
            'urn:zitadel:iam:org:project:roles': {
                'org-admin': {
                    '1234567890098765432': `${TEST_ORG_ID}.provider.io`,
                },
            },
        },
    },
    'cf-custodian-token': {
        email: 'custodian-user@email.com',
        custom: {
            'urn:zitadel:iam:org:project:roles': {
                'data-custodian': {
                    '1234567890098765432': `${TEST_ORG_ID}.provider.io`,
                },
            },
        },
    },
    'cf-user-token': {
        email: 'user-user@email.com',
        custom: {
            'urn:zitadel:iam:org:project:roles': {
                'org-user': {
                    '1234567890098765432': `${TEST_ORG_ID}.provider.io`,
                },
            },
        },
    },
    'cf-platform-admin-token': {
        email: 'platform-admin@email.com',
        custom: {
            'urn:zitadel:iam:org:project:roles': {
                'platform-admin': {
                    '1234567890098765432': `${TEST_ORG_ID}.provider.io`,
                },
            },
        },
    },
};

/**
 * Extracts the organization ID from a given Cloudflare token
 *
 * @param cfToken - The Cloudflare token to extract the organization ID from
 * @returns The organization ID as a string
 * @throws Error if user is not found or has invalid role structure
 */
export function getOrgId(cfToken: string): string {
    const user = validUsers[cfToken];
    if (!user) {
        throw new Error(`User not found for token: ${cfToken}`);
    }

    const rolesKey = 'urn:zitadel:iam:org:project:roles';
    const custom = user.custom[rolesKey];
    if (!custom) {
        throw new Error(`No roles found for token: ${cfToken}`);
    }

    const roles = Object.values(custom);
    if (roles.length === 0) {
        throw new Error(`Empty roles object for token: ${cfToken}`);
    }

    const orgValues = Object.values(roles[0]);
    if (orgValues.length === 0) {
        throw new Error(`No organization values found for token: ${cfToken}`);
    }

    return orgValues[0];
}
