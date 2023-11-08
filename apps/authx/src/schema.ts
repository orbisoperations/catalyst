import { createSchema } from 'graphql-yoga';
import { Context } from 'hono';
import status from './status';
import { AuthzedClient, ZitadelClient } from 'ozguard';
import { AuthzedManagers } from './index';

export default createSchema({
	typeDefs: `
    type Query {
        health: String!
        status: Status!
        user(userId: String!): UserInfo!
		group(groupId: String!): GroupInfo!
        validateUser(token: String!): UserValidation
        listUsersInOrganization(orgId: String!): [String!]!
        listAdminsInOrganization(orgId: String!): [String!]!
		listGroupAdmins(groupId: String!): [String!]!
		listServiceAccountsInOrganization(orgId: String!): [String!]!
    }

    type Mutation {
		addAdminToOrganization(orgId: String!, userId: String!): Boolean!
		addAdminToGroup(userId: String!, groupId: String!): Boolean!
        addDataServiceToOrganization(orgId: String!, dataServiceId: String!): Boolean!
		addOwnerToGroup(userId: String!, groupId: String!): Boolean!
        addOwnerToOrganization(orgId: String!, userId: String!): Boolean!
		addUserToGroup(userId: String!, groupId: String!): Boolean!
        addUserToOrganization(orgId: String!, userId: String!): Boolean!
		addOrganizationToGroup(organizationId: String!, groupId: String!): Boolean!
		adOwnerToDataService(dataServiceId: String!, userId: String!): Boolean!
		addServiceAccountToGroup(serviceAccountId: String!, groupId: String!): Boolean!
		addServiceAccountToOrganization(userId: String!, serviceAccountId: String!): Boolean!
		removeAdminFromOrganization(orgId: String!, userId: String!): Boolean!
		removeAdminFromGroup(groupId: String!, userId: String!): Boolean!
		removeDataServiceFromOrganization(dataServiceId: String!, orgId: String!): Boolean!
		removeUserFromGroup(userId: String!, groupId: String!): Boolean!
		removeServiceAccountFromOrganization(serviceAccountId: String!, orgId: String!): Boolean!

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
			validateUser: async (_, { token }, context: Context) => {
				console.log(_, token, context);
				const zitadelClient: ZitadelClient = context.get('zitadel');
				const validCheck = await zitadelClient?.validateTokenByIntrospection(token, true);
				if (validCheck === undefined || validCheck.active === false) {
					return {
						valid: false,
					};
				}

				return {
					valid: validCheck.active,
					userId: validCheck.sub,
					orgId: validCheck['urn:zitadel:iam:user:resourceowner:id'],
				};
			},
			listUsersInOrganization: async (_, { orgId }, context: Context) => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				return authzedClient.managers.org.listUsersInOrganization(authzedClient.utils, orgId);
			},
			listAdminsInOrganization: async (_, { orgId }, context: Context) => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				return authzedClient.managers.org.listAdminsInOrganization(authzedClient.utils, orgId);
			},
			listServiceAccountsInOrganization: async (_, { orgId }, context: Context) => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				return authzedClient.managers.org.listServiceAccountsInOrganization(authzedClient.utils, orgId);
			},
			listGroupAdmins: async (_, { groupId }, context: Context) => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				return authzedClient.managers.group.listGroupAdmins(authzedClient.utils, groupId);
			},
			user(_, { userId }, context: Context) {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				console.log('user called with ', userId);
				return authzedClient.managers.user.getUserInfo(authzedClient.utils, userId);
			},
			group(_, { groupId }, context: Context) {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				return authzedClient.managers.group.getGroupInfo(authzedClient.utils, groupId);
			},
		},
		Mutation: {
			addAdminToOrganization: async (_, { orgId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.org.addAdminToOrganization(authzedClient.utils, orgId, userId);

				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addUserToOrganization: async (_, { orgId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.org.addUserToOrganization(authzedClient.utils, orgId, userId);

				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addOwnerToOrganization: async (_, { orgId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.org.addUserToOrganization(authzedClient.utils, orgId, userId, true);

				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addDataServiceToOrganization: async (_, { orgId, dataServiceId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.org.addDataServiceToOrganization(authzedClient.utils, dataServiceId, orgId);

				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			removeDataServiceFromOrganization: async (_, { orgId, dataServiceId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.org.removeDataServiceFromOrganization(authzedClient.utils, dataServiceId, orgId);

				if (result.deletedAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			adOwnerToDataService: async (_, { dataServiceId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.service.addOwnerToDataService(authzedClient.utils, userId, dataServiceId);

				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addOrganizationToGroup: async (_, { organizationId, groupId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.group.addOrganizationToGroup(authzedClient.utils, organizationId, groupId);
				return result.writtenAt ? true : false;
			},
			addUserToGroup: async (_, { groupId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.user.addUserToGroup(authzedClient.utils, userId, groupId);
				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			removeUserFromGroup: async (_, { groupId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.user.removeUserFromGroup(authzedClient.utils, userId, groupId);
				if (result.deletedAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			removeAdminFromOrganization: async (_, { orgId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.org.removeAdminFromOrganization(authzedClient.utils, orgId, userId);
				if (result.deletedAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			removeServiceAccountFromOrganization: async (_, { serviceAccountId, orgId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.org.removeServiceAccountFromOrganization(authzedClient.utils, serviceAccountId, orgId);
				if (result.deletedAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addAdminToGroup: async (_, { groupId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.group.addAdminToGroup(authzedClient.utils, userId, groupId);
				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			removeAdminFromGroup: async (_, { groupId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.group.removeAdminFromGroup(authzedClient.utils, userId, groupId);
				if (result.deletedAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addOwnerToGroup: async (_, { groupId, userId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.user.addUserToGroup(authzedClient.utils, userId, groupId, true);
				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addServiceAccountToGroup: async (_, { groupId, serviceAccountId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const result = await authzedClient.managers.group.addServiceAccountToGroup(authzedClient.utils, serviceAccountId, groupId);
				if (result.writtenAt) {
					return true;
				}

				console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
				return false;
			},
			addServiceAccountToOrganization: async (_, { userId, serviceAccountId }, context: Context): Promise<boolean> => {
				const authzedClient: AuthzedClient<AuthzedManagers> = context.get('authzed');
				const orgs = await authzedClient.managers.user.getUserOrganizations(authzedClient.utils, userId);
				if (orgs.length == 1) {
					const result = await authzedClient.managers.org.addServiceAccountToOrganization(authzedClient.utils, serviceAccountId, orgs[0]);
					if (result.writtenAt) {
						return true;
					}

					console.error(`error writing to authzed - code: ${result.code}, msg: ${result.message}`);
					return false;
				} else {
					console.log(`user ${userId} is member of ${orgs.length} organizations, not adding service account`);
					return false;
				}
			},
		},
	},
});
