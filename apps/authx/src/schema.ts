import { createSchema } from 'graphql-yoga';
import { Context } from 'hono';
import status from './status';
import { AuthzedClient, ZitadelClient } from '../../../packages/authx';

class Status {
	constructor() {}

	status() {
		return {
			health: 'ok',
		};
	}
}

export default createSchema({
	typeDefs: `
    type Query {
        health: String!
        status: Status!
        user(userId: String!): UserInfo!
		group(groupId: String!): GroupInfo!
        validateUser(token: String!): UserValidation
        listUsersInOrganization(orgId: String!): [String!]!
    }

    type Mutation {
        addUserToOrganization(orgId: String!, userId: String!): Boolean!
        addOwnerToOrganization(orgId: String!, userId: String!): Boolean!
        addDataServiceToOrganization(orgId: String!, dataServiceId: String!): Boolean!
		adOwnerToDataService(dataServiceId: String!, userId: String!): Boolean!
		addOrganizationToGroup(organizationId: String!, groupId: String!): Boolean!
		addUserToGroup(userId: String!, groupId: String!): Boolean!
		addOwnerToGroup(userId: String!, groupId: String!): Boolean!
		addServiceAccountToGroup(serviceAccountId: String!, groupId: String!): Boolean!
    }

    type Status {
        health: String!
    }

    type UserValidation {
        valid: Boolean!
        userId: String
        orgId: String
    }
    type User {
        relation: String
        subject: AuthzedObject
        resource: AuthzedObject
    }
    type UserInfo {
        groups: [String]
        organizations: [String]
		ownedGroups: [String]
		ownedOrganizations: [String]
        dataServices: [String]
        ownedDataServices: [String]
    }
	type GroupInfo {
		users: [String]
		serviceAccounts: [String]
		dataServices: [String]
		organizations: [String]
	}
    type AuthzedObject {
        objectType: String
        objectId: String
    }
    `,
	resolvers: {
		Query: {
			health: () => 'ok',
			status: () => status.status(),
			validateUser: (_, { token }, context: Context) => {
				console.log(_, token, context);
				return {
					valid: true,
					userId: 'test',
					orgId: 'org',
				};
			},
			listUsersInOrganization: async (_, { orgId }, context: Context) => {
				const authzedClient: AuthzedClient = context.get('authzed');
				return authzedClient.listUsersInOrganization(orgId);
			},
			user(_, { userId }, context: Context) {
				const authzedClient: AuthzedClient = context.get('authzed');
				console.log('user called with ', userId);
				return authzedClient.getUserInfo(userId);
			},
			group(_, { groupId }, context: Context) {
				const authzedClient: AuthzedClient = context.get('authzed');
				return authzedClient.getGroupInfo(groupId);
			},
		},
		Mutation: {
			addUserToOrganization: async (_, { orgId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient = context.get('authzed');
				const result = await authzedClient.addUserToOrganization(orgId, userId);

				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addOwnerToOrganization: async (_, { orgId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient = context.get('authzed');
				const result = await authzedClient.addUserToOrganization(orgId, userId, true);

				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addDataServiceToOrganization: async (_, { orgId, dataServiceId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient = context.get('authzed');
				const result = await authzedClient.addDataServiceToOrganization(orgId, dataServiceId);

				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			adOwnerToDataService: async (_, { dataServiceId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient = context.get('authzed');
				const result = await authzedClient.addOwnerToDataService(userId, dataServiceId);

				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addOrganizationToGroup: async (_, { organizationId, groupId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient = context.get('authzed');
				const result = await authzedClient.addOrganizationToGroup(organizationId, groupId);
				return result.writtenAt ? true : false;
			},
			addUserToGroup: async (_, { groupId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient = context.get('authzed');
				const result = await authzedClient.addUserToGroup(userId, groupId);
				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addOwnerToGroup: async (_, { groupId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient = context.get('authzed');
				const result = await authzedClient.addUserToGroup(userId, groupId, true);
				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addServiceAccountToGroup: async (_, { groupId, serviceAccountId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient = context.get('authzed');
				const result = await authzedClient.addServiceAccountToGroup(serviceAccountId, groupId);
				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
		},
	},
});
