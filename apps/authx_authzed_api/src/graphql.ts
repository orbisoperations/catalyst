import SchemaBuilder from '@pothos/core';
import {DurableObjectNamespace, DurableObjectStub} from "@cloudflare/workers-types"

export const builder = new SchemaBuilder<{
	Context: {
		env: {}
	};
}>({});

export enum OrgRole {
ADMIN ,
DATA_CUSTODIAN,
USER,
}
export class User {
	id: string
	organization: Organization
	role: OrgRole
	constructor(id: string, organization: Organization, role: OrgRole) {
		this.id = id
		this.organization = organization
		this.role = role
	}
}

export class DataChannel {
	id: string
	organization: Organization

	constructor(id: string, organization: Organization) {
		this.id = id
		this.organization = organization
	}
}

export class Organization {
	id: string
	admins: User[]
	dataCustodians: User[]
	users: User[]
	partneredOrgs: Organization[]
	dataChannels: DataChannel[]

	constructor(id: string, admins: User[], dataCustodians: User[], users: User[], partners: Organization[], dataChannels: DataChannel[])  {
		this.id = id
		this.admins = admins
		this.dataCustodians = dataCustodians
		this.users = users
		this.partneredOrgs = partners
		this.dataChannels = dataChannels
	}
}

builder.enumType(OrgRole, {
	name: "OrgRole"
})

builder.objectType(User, {
	name: "User",
	fields: (t) => ({
		id: t.exposeString('id', {}),
		organization: t.field({
			type: Organization,
			resolve: () => {
				return new Organization("test", [], [], [], [], [])
			}
		}),
		role: t.field({
			type: OrgRole,
			resolve: () => OrgRole.USER
		})
	})
})

builder.queryType({
	fields: (t) => ({
		publicKey: t.string({
			resolve: async (root, args, context) => {
				const d0 = getDurableNamespace(context.env.HSM)
				const pubKeyResp = await d0.fetch("http://d0.stub/pub", {
					method: "GET"
				})
				const {pem} = await pubKeyResp.json<{pem:string}>()
				return  pem
			}
		}),
		validate: t.field({
			args: {
				token: t.arg.string({required: true})
			},
			type: VerifiedResponse,
			resolve: async (root, args, context) => {
				const d0 = getDurableNamespace(context.env.HSM)
				const validateResp = await d0.fetch("https://authx-token-api.do-hsm/validate", {
					method: "POST",
					body: JSON.stringify({
						token: args.token
					})
				})

				const {valid, claims,  error} = await validateResp.json<{valid?: true, error?: string, claims?: string[]}>()
				if (error) {
					console.error(error)
				}
				return {
					valid: valid?? false,
					claims: claims?? undefined,
				}
			}
		})
	})
})

builder.mutationType({
	fields: (t) => ({
		sign: t.string({
			args: {
				entity: t.arg.string({required: true}),
				claims: t.arg.stringList({required: false}),
				expiry: t.arg.int({required: false})
			},
			resolve: async (root, args, context) => {
				const d0 = getDurableNamespace(context.env.HSM)
				const validateResp = await d0.fetch("https://authx-token-api.do-hsm/sign", {
					method: "POST",
					body: JSON.stringify({
						entity: args.entity,
						claims: args.claims,
						expiresIn: args.expiry
					})
				})

				const { token, error } = await validateResp.json<{token?: string, error?: string}>()
				if (error) {
					console.error(error)
					return ""
				}
				return token?? ""
			}
		})
	})
})

export default  builder.toSchema()
