import { AuthzedClient } from './authzed';
import { WorkerEntrypoint, RpcTarget } from 'cloudflare:workers';
import { Catalyst, DataChannelId, OrgId, UserId } from '@catalyst/schema_zod';

type ENV = {
	AUTHZED_ENDPOINT: string;
	AUTHZED_KEY: string;
	AUTHZED_PREFIX: string;
};

const emailTob64 = (email: string) => {
	return btoa(email);
};

export default class AuthzedWorker extends WorkerEntrypoint<ENV> {
	async schema() {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		const resp = await client.getSchema();
		return resp;
	}

	async addUserToOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		const resp = await client.addUserToOrganization(orgId, emailTob64(userId));
		console.log('synced new user', orgId, emailTob64(userId), resp);
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#user@${client.utils.schemaPrefix}user:${emailTob64(userId)}`,
			...resp,
		};
	}

	async deleteUserFromOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		const resp = await client.removeUserRoleFromOrganization(orgId, emailTob64(userId), Catalyst.RoleEnum.enum.user);
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#user@${client.utils.schemaPrefix}user:${emailTob64(userId)}`,
			...resp,
		};
	}

	async addDataCustodianToOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		const resp = await client.addDataCustodianToOrganization(orgId, emailTob64(userId));
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#data_custodian@${client.utils.schemaPrefix}user:${emailTob64(userId)}`,
			...resp,
		};
	}

	async deleteDataCustodianFromOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		const resp = await client.removeUserRoleFromOrganization(orgId, emailTob64(userId), Catalyst.RoleEnum.enum.data_custodian);
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#user@${client.utils.schemaPrefix}user:${emailTob64(userId)}`,
			...resp,
		};
	}

	async addAdminToOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		const resp = await client.addAdminToOrganization(orgId, emailTob64(userId));
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#admin@${client.utils.schemaPrefix}user:${emailTob64(userId)}`,
			...resp,
		};
	}

	async deleteAdminFromOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		const resp = await client.removeUserRoleFromOrganization(orgId, emailTob64(userId), Catalyst.RoleEnum.enum.admin);
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#user@${client.utils.schemaPrefix}user:${emailTob64(userId)}`,
			...resp,
		};
	}

	async listUsersInOrg(orgId: OrgId, userId?: UserId, roles?: Catalyst.RoleEnum[]) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		const resp = await client.listUsersInOrganization(orgId, {
			userId: userId ? emailTob64(userId) : undefined,
			roles,
		});
		return resp.map((elem) => {
			return {
				object: elem.object,
				relation: elem.relation,
				subject: atob(elem.subject),
			};
		});
	}

	async addDataChannelToOrg(orgId: OrgId, dataChannelId: DataChannelId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return await client.addDataChannelToOrganization(orgId, dataChannelId);
	}
	async listDataChannelsInOrg(orgId: OrgId, dataChannelId?: DataChannelId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return await client.listDataChannelsInOrganization(orgId, dataChannelId);
	}
	async deleteDataChannelInOrg(orgId: OrgId, dataChannelId: DataChannelId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return await client.deleteDataChannelInOrganization(orgId, dataChannelId);
	}

	async addPartnerToOrg(orgId: OrgId, partnerId: OrgId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return await client.addParnterToOrganization(orgId, partnerId);
	}
	async listPartnersInOrg(orgId: OrgId, parnterId?: DataChannelId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return await client.listParntersInOrganization(orgId, parnterId);
	}
	async deletePartnerInOrg(orgId: OrgId, parnterId: OrgId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return await client.deleteParnterInOrganization(orgId, parnterId);
	}

	async isMemberOfOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return client.organizationPermissionsCheck(orgId, emailTob64(userId), Catalyst.Org.PermissionsEnum.enum.member);
	}

	async canAssignRolesInOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return client.organizationPermissionsCheck(orgId, emailTob64(userId), Catalyst.Org.PermissionsEnum.enum.role_assign);
	}

	async canCreateUpdateDeleteDataChannel(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return (
			(await client.organizationPermissionsCheck(orgId, emailTob64(userId), Catalyst.Org.PermissionsEnum.enum.data_channel_create)) &&
			(await client.organizationPermissionsCheck(orgId, emailTob64(userId), Catalyst.Org.PermissionsEnum.enum.data_channel_update)) &&
			(await client.organizationPermissionsCheck(orgId, emailTob64(userId), Catalyst.Org.PermissionsEnum.enum.data_channel_delete))
		);
	}

	async canReadDataChannel(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return await client.organizationPermissionsCheck(orgId, emailTob64(userId), Catalyst.Org.PermissionsEnum.enum.data_channel_read);
	}

	async addOrgToDataChannel(dataChannelId: DataChannelId, orgId: OrgId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return await client.addOrganizationToDataChannel(dataChannelId, orgId);
	}

	async listOrgsInDataChannel(dataChannelId: DataChannelId, orgId?: OrgId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return await client.listOrgsInDataChannels(dataChannelId, orgId);
	}

	async deleteOrgInDataChannel(dataChannelId: DataChannelId, orgId: OrgId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		return await client.deleteOrgInDataChannel(dataChannelId, orgId);
	}

	async canReadFromDataChannel(dataChannelId: DataChannelId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX);
		// console.log('checking permissions', dataChannelId, emailTob64(userId), userId);
		const res = await client.dataChannelPermissionsCheck(dataChannelId, emailTob64(userId), Catalyst.DataChannel.PermissionsEnum.enum.read);
		console.log(res);
		return res;
	}
}
