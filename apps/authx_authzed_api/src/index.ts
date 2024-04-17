import {AuthzedClient} from "./authzed"
import { WorkerEntrypoint, RpcTarget } from "cloudflare:workers";
import { CatalystRole, OrgId, UserId } from '@catalyst/schema_zod';

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

	async org(orgId: OrgId) {
		const client = new AuthzedClient(this.env.AUTHZED_ENDPOINT, this.env.AUTHZED_KEY, this.env.AUTHZED_PREFIX)
		return {
			addUser: async (userId: UserId) => {
				const resp = await client.addUserToOrganization(orgId, userId)
				return {
					entity: `${client.utils.schemaPrefix}organization:${orgId}#user@${client.utils.schemaPrefix}user:${userId}`,
					...resp
				}
				//return "orbisops_catalyst_dev/organization:Org1#user@orbisops_catalyst_dev/user:TestUser"
			},
			addDataCustodian: async (userId: UserId) => {
				const resp = await client.addDataCustodianToOrganization(orgId, userId)
				return {
					entity: `${client.utils.schemaPrefix}organization:${orgId}#data_custodian@${client.utils.schemaPrefix}user:${userId}`,
					...resp
				}
			},
			addAdmin: async (userId: UserId) => {
				const resp = await client.addAdminToOrganization(orgId, userId)
				return {
					entity: `${client.utils.schemaPrefix}organization:${orgId}#admin@${client.utils.schemaPrefix}user:${userId}`,
					...resp
				}
			},
			listUsers: async (userId?: UserId, roles?: CatalystRole[]) => {
				const resp = await client.listUsersInOrganization(orgId, {
					userId,
					roles
				})
				return resp
			},
			isMember: async (userId: UserId) => {
				const resp = await client.isMemberofOrganization
			}
		}
	}
}
