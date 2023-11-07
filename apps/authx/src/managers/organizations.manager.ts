import { AuthzedUtils, WriteRelationshipResult, DeleteRelationshipResult } from 'ozguard';

export class OrganizationManager {
	//constructor(private utils: AuthzedUtils) {}
	async addAdminToOrganization(utils: AuthzedUtils, org: string, user: string) {
		const { data } = await utils.fetcher(
			'write',
			utils.writeRelationship({
				relationOwner: {
					objectType: `organization`,
					objectId: org,
				},
				relation: 'admin',
				relatedItem: {
					objectType: `user`,
					objectId: user,
				},
			}),
		);
		return data as WriteRelationshipResult;
	}
	async addUserToOrganization(utils: AuthzedUtils, org: string, user: string, isOwner?: boolean): Promise<WriteRelationshipResult> {
		const body = utils.writeRelationship({
			relationOwner: {
				objectType: `organization`,
				objectId: org,
			},
			relation: isOwner ? 'owner' : 'member',
			relatedItem: {
				objectType: `user`,
				objectId: user,
			},
		});
		const { data } = await utils.fetcher('write', body);

		return data as WriteRelationshipResult;
	}
	async addDataServiceToOrganization(utils: AuthzedUtils, dataService: string, org: string): Promise<WriteRelationshipResult> {
		const { data } = await utils.fetcher(
			'write',
			utils.writeRelationship({
				relationOwner: {
					objectType: 'data_service',
					objectId: dataService,
				},
				relation: 'parent',
				relatedItem: {
					objectType: 'organization',
					objectId: org,
				},
			}),
		);
		return data as WriteRelationshipResult;
	}

	async addServiceAccountToOrganization(utils: AuthzedUtils, serviceAccount: string, org: string): Promise<WriteRelationshipResult> {
		const { data } = await utils.fetcher(
			'write',
			utils.writeRelationship({
				relationOwner: {
					objectType: 'organization',
					objectId: org,
				},
				relation: 'service_account',
				relatedItem: {
					objectType: 'service_account',
					objectId: serviceAccount,
				},
			}),
		);
		return data as WriteRelationshipResult;
	}

	async removeServiceAccountFromOrganization(utils: AuthzedUtils, serviceAccount: string, org: string): Promise<DeleteRelationshipResult> {
		const body = utils.deleteRelationship({
			relationOwner: {
				objectType: 'organization',
				objectId: org,
			},
			relation: 'service_account',
			relatedItem: {
				objectType: 'service_account',
				objectId: serviceAccount,
			},
		});
		const { data } = await utils.fetcher('delete', body);
		return data as DeleteRelationshipResult;
	}
	async removeDataServiceFromOrganization(utils: AuthzedUtils, dataService: string, org: string): Promise<DeleteRelationshipResult> {
		const body = utils.deleteRelationship({
			relationOwner: {
				objectType: 'data_service',
				objectId: dataService,
			},
			relation: 'parent',
			relatedItem: {
				objectType: 'organization',
				objectId: org,
			},
		});
		const { data } = await utils.fetcher('delete', body);
		return data as DeleteRelationshipResult;
	}
	async removeAdminFromOrganization(utils: AuthzedUtils, org: string, user: string) {
		const body = utils.deleteRelationship({
			relationOwner: {
				objectType: `organization`,
				objectId: org,
			},
			relation: 'admin',
			relatedItem: {
				objectType: `user`,
				objectId: user,
			},
		});
		const { data } = await utils.fetcher('delete', body);
		return data as DeleteRelationshipResult;
	}
	async listUsersInOrganization(utils: AuthzedUtils, org: string): Promise<string[]> {
		const { data } = await utils.fetcher(
			'read',
			utils.readRelationship({
				resourceType: 'organization',
				resourceId: org,
				relation: 'member',
			}),
		);

		return utils.parseSubjectIdsFromResults(data);
	}
	async listAdminsInOrganization(utils: AuthzedUtils, org: string): Promise<string[]> {
		const { data } = await utils.fetcher(
			'read',
			utils.readRelationship({
				resourceType: 'organization',
				relation: 'admin',
				resourceId: org,
			}),
		);

		return utils.parseSubjectIdsFromResults(data);
	}
	async listServiceAccountsInOrganization(utils: AuthzedUtils, org: string): Promise<string[]> {
		const { data } = await utils.fetcher(
			'read',
			utils.readRelationship({
				resourceType: 'organization',
				relation: 'service_account',
				resourceId: org,
			}),
		);

		return utils.parseSubjectIdsFromResults(data);
	}
}
