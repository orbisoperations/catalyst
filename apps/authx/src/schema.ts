import { createSchema } from 'graphql-yoga';
import { Context } from 'hono';
type AuthzedObject = {
	objectType: String;
	objectId: String;
};
type RelationShip = {
	relationOwner: AuthzedObject;
	relation: String;
	relatedItem: AuthzedObject;
};
const gateway_url = 'https://gateway-alpha.authzed.com/v1/';

function readRelationships(
	context: Context,
	searchInfo: {
		resourceType: string;
		resourceId?: string;
		relation?: string;
		optionalSubjectFilter?: {
			subjectType: string;
			optionalSubjectId: string;
		};
	}
) {
	const { resourceType, resourceId, relation, optionalSubjectFilter } = searchInfo;
	var myHeaders = new Headers();
	myHeaders.append('Content-Type', 'application/json');
	myHeaders.append('Authorization', `Bearer ${context.env.AUTHZED_TOKEN}`);
	var raw = JSON.stringify({
		consistency: {
			minimizeLatency: true,
		},
		relationshipFilter: {
			resourceType: resourceType,
			optionalResourceId: resourceId,
			optionalRelation: relation,
			optionalSubjectFilter,
		},
	});
	return fetch(gateway_url + 'relationships/read', {
		method: 'POST',
		headers: myHeaders,
		body: raw,
		redirect: 'follow',
	})
		.then((response) => response.text())
		.catch((error) => console.log('error', error));
}

function createRelationship(context: Context, relationshipInfo: RelationShip) {
	var myHeaders = new Headers();
	myHeaders.append('Content-Type', 'application/json');
	myHeaders.append('Authorization', `Bearer ${context.env.AUTHZED_TOKEN}`);

	var raw = JSON.stringify({
		updates: [
			{
				operation: 'OPERATION_TOUCH',
				relationship: {
					resource: {
						objectType: relationshipInfo.relationOwner.objectType,
						objectId: relationshipInfo.relationOwner.objectId,
					},
					relation: relationshipInfo.relation,
					subject: {
						object: {
							objectType: relationshipInfo.relatedItem.objectType,
							objectId: relationshipInfo.relatedItem.objectId,
						},
					},
				},
			},
		],
	});

	return fetch(gateway_url + 'relationships/write', {
		method: 'POST',
		headers: myHeaders,
		body: raw,
		redirect: 'follow',
	})
		.then((response) => response.text())
		.then((result) => result)
		.catch((error) => console.log('error', error));
}

export default createSchema({
	typeDefs: `
    type Health {
        health: String!
    }
    type AuthzedObject {
        objectType: String
        objectId: String
    }
    type OrgOwner {
        subject: AuthzedObject
        resource: AuthzedObject
        relation: String

    }
    type OrgUser {
        relation: String
        subject: AuthzedObject
        resource: AuthzedObject
    }
    type User {
        groups: [String]
        organization: String
        data_services: [String]
        user_data_services: [String]
    }
    type Query {
        users(orgId: String!, relation: String): [OrgUser]
        user(userId: String!, relation: String): User
    }
    type Mutation {
        addRelation(relation: String!, owner: String!, ownerType : String! related: String!, relatedType: String!): String
    }
    `,
	resolvers: {
		Query: {
			users: async (_, { orgId, relation }, context: Context) => {
				const relationships = await readRelationships(context, {
					resourceType: 'orbisops_tutorial/organization',
					resourceId: orgId,
					relation: relation,
				});
				const res = relationships?.split('\n').slice(0, -1);
				let users = [];
				if (res) {
					users = res.map((r) => {
						const result = JSON.parse(r)?.result;
						if (result) {
							const relation = result.relationship.relation;
							const resource = result.relationship.resource;
							const subject = result.relationship.subject.object;
							return { subject, relation, resource };
						}
					});
					return users;
				}
				return [];
			},
			user: async (_, { userId, relation }, context: Context) => {
				// get the groups of the user where the user is a member or an owner if specified
				const groupsResponse = await readRelationships(context, {
					resourceType: 'orbisops_tutorial/group',
					relation: relation ?? 'member',
					optionalSubjectFilter: {
						subjectType: 'orbisops_tutorial/user',
						optionalSubjectId: userId,
					},
				});
				const res = groupsResponse?.split('\n').slice(0, -1);
				const groups = res?.map((r) => {
					const result = JSON.parse(r)?.result;
					if (result) {
						const resource = result.relationship.resource;
						return resource.objectId;
					}
				});
				// get the organization of the user where the user is a member or an owner if specified
				const organizationResponse = await readRelationships(context, {
					resourceType: 'orbisops_tutorial/organization',
					relation: relation ?? 'member',
					optionalSubjectFilter: {
						subjectType: 'orbisops_tutorial/user',
						optionalSubjectId: userId,
					},
				});

				const orgres = organizationResponse?.split('\n').slice(0, -1);
				const organizations = orgres?.map((r) => {
					const result = JSON.parse(r)?.result;
					if (result) {
						const resource = result.relationship.resource;
						return resource.objectId;
					}
				});
				// assuming we can only be members of one organization
				const organization = organizations?.[0];
				// with an organization we can get the data services that belong to it.
				//
				let data_services = [];
				if (organization) {
					const dataServiceResponse = await readRelationships(context, {
						resourceType: 'orbisops_tutorial/data_service',
						relation: 'parent',
						optionalSubjectFilter: {
							subjectType: 'orbisops_tutorial/organization',
							optionalSubjectId: organization,
						},
					});
					// user data services, here we only want to know which data services the user owns
					const dataServiceArray = dataServiceResponse?.split('\n').slice(0, -1);
					data_services = dataServiceArray
						? dataServiceArray.map((r) => {
								const result = JSON.parse(r)?.result;
								if (result) {
									const resource = result.relationship.resource;
									return resource.objectId;
								}
						  })
						: [];
				}
				const userDataServiceResponse = await readRelationships(context, {
					resourceType: 'orbisops_tutorial/data_service',
					relation: 'owner',
					optionalSubjectFilter: {
						subjectType: 'orbisops_tutorial/organization',
						optionalSubjectId: organization,
					},
				});

				const userDataServiceArray = userDataServiceResponse?.split('\n').slice(0, -1);
				const user_data_services = userDataServiceArray?.map((r) => {
					const result = JSON.parse(r)?.result;
					if (result) {
						const resource = result.relationship.resource;
						return resource.objectId;
					}
				});
				return {
					groups,
					organization,
					data_services,
					user_data_services,
				};
			},
		},
		Mutation: {
			addRelation: async (_, { relation, owner, ownerType, related, relatedType }, context: Context) => {
				const relationship = {
					relationOwner: {
						objectType: ownerType,
						objectId: owner,
					},
					relation,
					relatedItem: {
						objectType: relatedType,
						objectId: related,
					},
				} as RelationShip;
				const result = await createRelationship(context, relationship);
				return result;
			},
		},
		Health: {
			health: () => 'ok',
		},
	},
});
