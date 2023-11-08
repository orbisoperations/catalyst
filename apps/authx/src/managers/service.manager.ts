import { AuthzedUtils, WriteRelationshipResult } from 'ozguard';

export class ServiceManager {
	async addOwnerToDataService(utils: AuthzedUtils, user: string, dataService: string) {
		const { data } = await utils.fetcher(
			'write',
			utils.writeRelationship({
				relationOwner: {
					objectType: `data_service`,
					objectId: dataService,
				},
				relation: 'owner',
				relatedItem: {
					objectType: `user`,
					objectId: user,
				},
			}),
		);
		return data as WriteRelationshipResult;
	}
}
