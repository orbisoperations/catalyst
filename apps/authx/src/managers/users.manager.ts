import { AuthzedUtils, WriteRelationshipResult, DeleteRelationshipResult } from 'ozguard';

export class UserManager {
	//constructor(private utils: AuthzedUtils) {}
	// users
	async getUserInfo(
		utils: AuthzedUtils,
		user: string,
	): Promise<{
		organizations?: string[];
		groups?: string[];
		ownedGroups?: string[];
		ownedOrganizations?: string[];
		ownedDataServices?: string[];
		dataServices?: string[];
	}> {
		const promises = await Promise.allSettled([
			utils.getDataServiceParentOrg(),
			this.getUserOrganizations(utils, user),
			this.getUserOwnedOrganizations(utils, user),
			this.getUserGroups(utils, user),
			this.getUserOwnedGroups(utils, user),
			this.getUserOwnedDataServices(utils, user),
		]);
		const dataServices = promises[0].status === 'fulfilled' ? promises[0].value : [];
		const organizations = promises[1].status === 'fulfilled' ? promises[1].value : [];
		const ownedOrganizations = promises[2].status === 'fulfilled' ? promises[2].value : [];
		const groups = promises[3].status === 'fulfilled' ? promises[3].value : [];
		const ownedGroups = promises[4].status === 'fulfilled' ? promises[4].value : [];
		const ownedDataServices = promises[5].status === 'fulfilled' ? promises[5].value : [];
		const orgServices = dataServices.filter((service) => {
			return organizations.includes(service.subject) || ownedOrganizations.includes(service.subject);
		});
		const response = {
			organizations,
			ownedOrganizations,
			groups,
			ownedGroups,
			ownedDataServices,
			dataServices: orgServices.map((service) => service.resource),
		};

		return response;
	}
	async getUserGroups(utils: AuthzedUtils, user: string): Promise<string[]> {
		const { data } = await utils.fetcher(
			'read',
			utils.readRelationship({
				resourceType: 'group',
				relation: 'member',
				optionalSubjectFilter: {
					subjectType: 'user',
					optionalSubjectId: user,
				},
			}),
		);

		return utils.parseResourceIdsFromResults(data);
	}
	async getUserOrganizations(utils: AuthzedUtils, user: string): Promise<string[]> {
		const body = utils.readRelationship({
			resourceType: 'organization',
			relation: 'member',
			optionalSubjectFilter: {
				subjectType: 'user',
				optionalSubjectId: user,
			},
		});
		const { data } = await utils.fetcher('read', body);
		return utils.parseResourceIdsFromResults(data);
	}

	async getUserOwnedGroups(utils: AuthzedUtils, user: string): Promise<string[]> {
		const body = utils.readRelationship({
			resourceType: 'group',
			relation: 'owner',
			optionalSubjectFilter: {
				subjectType: 'user',
				optionalSubjectId: user,
			},
		});
		const { data } = await utils.fetcher('read', body);
		const response = utils.parseResourceIdsFromResults(data);
		return response;
	}

	async getUserOwnedOrganizations(utils: AuthzedUtils, user: string): Promise<string[]> {
		const { data } = await utils.fetcher(
			'read',
			utils.readRelationship({
				resourceType: 'organization',
				relation: 'owner',
				optionalSubjectFilter: {
					subjectType: 'user',
					optionalSubjectId: user,
				},
			}),
		);

		return utils.parseResourceIdsFromResults(data);
	}

	async getUserOwnedDataServices(utils: AuthzedUtils, user: string): Promise<string[]> {
		const { data } = await utils.fetcher(
			'read',
			utils.readRelationship({
				resourceType: 'data_service',
				relation: 'owner',
				optionalSubjectFilter: {
					subjectType: 'user',
					optionalSubjectId: user,
				},
			}),
		);

		return utils.parseResourceIdsFromResults(data);
	}
	async removeUserFromGroup(utils: AuthzedUtils, user: string, group: string) {
		const body = utils.deleteRelationship({
			relationOwner: {
				objectType: `group`,
				objectId: group,
			},
			relation: 'member',
			relatedItem: {
				objectType: `user`,
				objectId: user,
			},
		});
		const { data } = await utils.fetcher('delete', body);
		return data as DeleteRelationshipResult;
	}
	async addUserToGroup(utils: AuthzedUtils, user: string, group: string, isOwner?: boolean) {
		const body = utils.writeRelationship({
			relationOwner: {
				objectType: `group`,
				objectId: group,
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
}
