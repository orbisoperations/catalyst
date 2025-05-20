export const TEST_ORG_ID = 'localdevorg';

export const validUsers: Record<string, { email: string; custom: Record<string, Record<string, Record<string, string>>> }> = {
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
