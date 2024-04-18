import {AuthzedClient} from "./authzed"
import { WorkerEntrypoint, RpcTarget } from "cloudflare:workers";
import { CatalystOrgPermissions, CatalystRole, OrgId, UserId } from '@catalyst/schema_zod';

type ENV = {
	AUTHZED_ENDPOINT: string
	AUTHZED_KEY: string
	AUTHZED_PREFIX: string
}

export default class AuthzedWorker extends WorkerEntrypoint<ENV> {
	async schema(){
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		const resp = await client.getSchema()
		return resp
	}

	async addUserToOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		const resp = await client.addUserToOrganization(orgId, userId)
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#user@${client.utils.schemaPrefix}user:${userId}`,
		...resp
		}
	}

	async deleteUserFromOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		const resp = await client.removeUserRoleFromOrganization(orgId, userId, CatalystRole.enum.user)
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#user@${client.utils.schemaPrefix}user:${userId}`,
			...resp
		}
	}

	async addDataCustodianToOrg(orgId: OrgId, userId: UserId){
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		const resp = await client.addDataCustodianToOrganization(orgId, userId)
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#data_custodian@${client.utils.schemaPrefix}user:${userId}`,
			...resp
		}
	}

	async deleteDataCustodianFromOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		const resp = await client.removeUserRoleFromOrganization(orgId, userId, CatalystRole.enum.data_custodian)
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#user@${client.utils.schemaPrefix}user:${userId}`,
			...resp
		}
	}

	async addAdminToOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		const resp = await client.addAdminToOrganization(orgId, userId)
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#admin@${client.utils.schemaPrefix}user:${userId}`,
			...resp
		}
	}

	async deleteAdminFromOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		const resp = await client.removeUserRoleFromOrganization(orgId, userId, CatalystRole.enum.admin)
		return {
			entity: `${client.utils.schemaPrefix}organization:${orgId}#user@${client.utils.schemaPrefix}user:${userId}`,
			...resp
		}
	}

	async listUsersInOrg(orgId: OrgId, userId?: UserId, roles?: CatalystRole[]) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		const resp = await client.listUsersInOrganization(orgId, {
			userId,
			roles
		})
		return resp
	}

	async isMemberOfOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		return client.organizationPermissionsCheck(orgId, userId, CatalystOrgPermissions.enum.member)
	}

	async canAssignRolesInOrg(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		return client.organizationPermissionsCheck(orgId, userId, CatalystOrgPermissions.enum.role_assign)
	}

	async canCreateUpdateDeleteDataChannel(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		return await client.organizationPermissionsCheck(orgId, userId, CatalystOrgPermissions.enum.data_channel_create)
			&& await client.organizationPermissionsCheck(orgId, userId, CatalystOrgPermissions.enum.data_channel_update)
			&& await client.organizationPermissionsCheck(orgId, userId, CatalystOrgPermissions.enum.data_channel_delete)
	}

	async canReadDataChannel(orgId: OrgId, userId: UserId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		return await client.organizationPermissionsCheck(orgId, userId, CatalystOrgPermissions.enum.data_channel_read)

	}
}
