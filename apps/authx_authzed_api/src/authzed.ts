//import { UserManager, GroupManager, OrganizationManager } from "./managers";
import {
	CatalystRole,
	CatalystEntity,
	UserId,
	OrgId,
	AuthzedRelationshipQueryResponse,
	CatalystOrgRelationship,
	CatalystOrgPermissions,
	AuthzedPermissionCheckResponse,
	AuthzedPermissionCheckResponseError,
	AuthzedPermissionCheckResponseSuccess,
	AuthzedPermissionCheck,
} from '@catalyst/schema_zod';

export type AuthzedObject = {
	objectType: String;
	objectId: String;
};
export type RelationShip = {
	relationOwner: AuthzedObject;
	relation: String;
	relatedItem: AuthzedObject;
};
export type SearchInfo = {
	resourceType: string;
	resourceId?: string;
	relation?: string;
	optionalSubjectFilter?: {
		subjectType: string;
		optionalSubjectId: string;
	};
};
export interface ReadRelationshipResult {
	result: {
		readAt: {
			token: string;
		};
		relationship: {
			resource: {
				objectType: string;
				objectId: string;
			};
			relation: string;
			subject: {
				object: {
					objectType: string;
					objectId: string;
				};
				optionalRelation: string;
			};
			optionalCaveat: {
				caveatName: string;
				context: string;
			};
		};
	};
	error: {
		code: string;
		message: string;
	};
}

export interface WriteRelationshipResult {
	writtenAt?: {
		token: string;
	};
	code?: number;
	message?: string;
}

export interface DeleteRelationshipResult {
	deletedAt?: {
		token: string;
	};
	code?: number;
	message?: string;
	deletionProgress?: string;
}

export type WriteRelationshipBody = {
	updates: {
		operation: 'OPERATION_TOUCH';
		relationship: {
			resource: {
				objectType: String;
				objectId: String;
			};
			relation: String;
			subject: {
				object: {
					objectType: String;
					objectId: String;
				};
			};
		};
	}[];
};

export type DeleteRelationshipBody = {
	relationshipFilter: {
		resourceType: String;
		optionalResourceId: String;
		optionalRelation: String;
		optionalSubjectFilter: {
			subjectType: String;
			optionalSubjectId: String;
		};
	};
};

export type SearchInfoBody = {
	consistency?: {
		minimizeLatency: boolean;
	};
	relationshipFilter: {
		resourceType: string;
		optionalResourceId?: string;
		optionalRelation?: string;
		optionalSubjectFilter?: {
			subjectType: string;
			optionalSubjectId: string;
		};
	};
};

export type LookupBody = {
	consistency?: {
		minimizeLatency: boolean;
	};
	subjectObjectType: string;
	permission: string;
	resource: {
		objectType: string;
		objectId: string;
	};
};

export interface PermissionCheckRequest {
	consistency: {
		minimizeLatency: boolean
		atLeastAsFresh?: {
			token: string
		},
		atExactSnapshot?: {
			token: string
		},
		fullyConsistent?: boolean
	},
	resource: {
		objectType: string,
		objectId: string
	},
	permission: string,
	subject: {
		object: {
			objectType: string,
			objectId: string
		},
		optionalRelation?: string
	},
	context?: {}
}


export class AuthzedClient {
	utils: AuthzedUtils;
	constructor(endpoint: string, token: string, schemaPrefix?: string) {
		this.utils = new AuthzedUtils(endpoint, token, schemaPrefix);
	}

	async fetcher() {
		return this.utils.fetcher;
	}

	async getSchema() {
		// /v1/schema/read
		const resp = await fetch(`${this.utils.endpoint}/v1/schema/read`, {
			method: 'POST',
			headers: {
				...this.utils.headers()
			}
		})

		const result = await resp.json() as {schemaText: string, readAt: {token: string}}
		return result
	}

	async addUserToOrganization(
		org: string,
		user: string,
	): Promise<WriteRelationshipResult> {
		const body = this.utils.writeRelationship({
			relationOwner: {
				objectType: CatalystEntity.enum.organization,
				objectId: org,
			},
			relation:  CatalystRole.enum.user,
			relatedItem: {
				objectType: CatalystEntity.enum.user,
				objectId: user,
			},
		});
		const { data } = await this.utils.fetcher('write', body);

		return data as WriteRelationshipResult;
	}

	async removeUserRoleFromOrganization(
		org: string,
		user: string,
		role: CatalystRole
	): Promise<WriteRelationshipResult> {
		const body = this.utils.deleteRelationship({
			relationOwner: {
				objectType: CatalystEntity.enum.organization,
				objectId: org,
			},
			relation:  role,
			relatedItem: {
				objectType: CatalystEntity.enum.user,
				objectId: user,
			},
		});
		const { data } = await this.utils.fetcher('delete', body);
		console.log(data)
		return data as WriteRelationshipResult;
	}

	async addDataCustodianToOrganization(
		org: string,
		user: string,
	): Promise<WriteRelationshipResult> {
		const body = this.utils.writeRelationship({
			relationOwner: {
				objectType: CatalystEntity.enum.organization,
				objectId: org,
			},
			relation:  CatalystRole.enum.data_custodian,
			relatedItem: {
				objectType: CatalystEntity.enum.user,
				objectId: user,
			},
		});
		const { data } = await this.utils.fetcher('write', body);

		return data as WriteRelationshipResult;
	}

	async addAdminToOrganization(
		org: string,
		user: string,
	): Promise<WriteRelationshipResult> {
		const body = this.utils.writeRelationship({
			relationOwner: {
				objectType: CatalystEntity.enum.organization,
				objectId: org,
			},
			relation:  CatalystRole.enum.admin,
			relatedItem: {
				objectType: CatalystEntity.enum.user,
				objectId: user,
			},
		});
		const { data } = await this.utils.fetcher('write', body);

		return data as WriteRelationshipResult;
	}

	async listUsersInOrganization(orgId: OrgId, args: {
		userId?: UserId,
		roles?: CatalystRole[]
	}) {
		const searchRoles = args.roles?? [
			CatalystRole.enum.user,
			CatalystRole.enum.data_custodian,
			CatalystRole.enum.admin
		]

		let results : CatalystOrgRelationship[] = []

		for (const role of searchRoles) {
			const body = this.utils.readRelationship({
				resourceType: CatalystEntity.enum.organization,
				resourceId: orgId,
				relation: role,
				optionalSubjectFilter: args.userId ? {
					subjectType: CatalystEntity.enum.user,
					optionalSubjectId: args.userId
				} : undefined
			})

			const { data } = await this.utils.fetcher('read', body);
			const result = this.utils.parseOrganizationData(data)
			results.push(...result)
		}

		return results
	}
	async getUserOrganizations(user: string): Promise<string[]> {
		const body = this.utils.readRelationship({
			resourceType: 'organization',
			relation: 'member',
			optionalSubjectFilter: {
				subjectType: 'user',
				optionalSubjectId: user,
			},
		});
		const { data } = await this.utils.fetcher('read', body);
		return this.utils.parseResourceIdsFromResults(data);
	}

	async organizationPermissionsCheck(orgId: OrgId, userId: UserId, permission: CatalystOrgPermissions) {
		//zed permission check orbisops_catalyst_dev/organization:Org1  member orbisops_catalyst_dev/user:TestUser --insecure --token atoken
		const req = this.utils.checkPermission(orgId, userId, permission)
		const { data } = await this.utils.permissionFetcher(req)

		const permissionResp = AuthzedPermissionCheckResponse.parse(data)
		if (typeof  permissionResp === typeof AuthzedPermissionCheckResponseSuccess) {
			const success = AuthzedPermissionCheckResponseSuccess.parse(permissionResp)
			return success.permissionship === AuthzedPermissionCheck.enum.PERMISSIONSHIP_HAS_PERMISSION
		}
		console.log(permissionResp)
		return false
	}
}

export class AuthzedUtils {
	endpoint: string;
	token: string;
	schemaPrefix: string;

	constructor(endpoint: string, token: string, schemaPrefix?: string) {
		this.endpoint = endpoint;
		this.token = token;

		this.schemaPrefix = schemaPrefix ?? 'orbisops_tutorial/';
	}

	headers(): object {
		return {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${this.token}`,
		};
	}

	async fetcher(
		action: 'read' | 'write' | 'delete',
		data:
			| SearchInfoBody
			| WriteRelationshipBody
			| DeleteRelationshipBody
	) {
		return await fetch(`${this.endpoint}/v1/relationships/${action}`, {
			method: 'POST',
			headers: {
				...this.headers(),
			},
			body: JSON.stringify(data),
		})
			.then(async (res) => {
				try {
					return {
						data: action == 'read' ? await res.text() : await res.json(),
						success: true,
					};
				} catch (e) {
					return { data: {}, success: false };
				}
			})
			.then((res) => res);
	}

	async permissionFetcher(
		data:
			| PermissionCheckRequest
	) {
		return await fetch(`${this.endpoint}/v1/permissions/check`, {
			method: 'POST',
			headers: {
				...this.headers(),
			},
			body: JSON.stringify(data),
		})
			.then(async (res) => {
				try {
					return {
						data: await res.json(),
						success: true,
					};
				} catch (e) {
					return { data: {}, success: false };
				}
			})
			.then((res) => res);
	}

	parseResourceIdsFromResults(data: any): string[] | PromiseLike<string[]> {
		if (typeof data === 'string') {
			const objectIds = this.parseNDJONFromAuthzed(data).map((result) => {
				return (result as ReadRelationshipResult).result.relationship
					.resource.objectId;
			});
			return objectIds;
		}

		return [
			(data as ReadRelationshipResult).result.relationship.resource
				.objectId,
		];
	}

	parseOrganizationData(
		data: any
	):  CatalystOrgRelationship[] {
		const resp = this.parseNDJONFromAuthzed(data).map(val => {
			return AuthzedRelationshipQueryResponse.parse(val)
		})

		return resp.map(result => {
			return {
				orgId: result.result.relationship.resource.objectId,
					relation: result.result.relationship.relation,
				subject: result.result.relationship.subject.object.objectId
			}
		})
	}
	parseObjectandSubjectFromResults(
		data: any
	):
		| { subject: string; resource: string }[]
		| PromiseLike<{ subject: string; resource: string }[]> {
		if (typeof data === 'string') {
			const objectIds = this.parseNDJONFromAuthzed(data).map((result) => {
				return {
					subject: (result as ReadRelationshipResult).result.relationship
						.subject.object.objectId,
					resource: (result as ReadRelationshipResult).result.relationship
						.resource.objectId,
				};
			});
			return objectIds;
		}

		return [
			{
				subject: (data as ReadRelationshipResult).result.relationship
					.subject.object.objectId,
				resource: (data as ReadRelationshipResult).result.relationship
					.resource.objectId,
			},
		];
	}
	parseSubjectIdsFromResults(data: any): string[] | PromiseLike<string[]> {
		if (typeof data === 'string') {
			const objectIds = this.parseNDJONFromAuthzed(data).map((result) => {
				return (result as ReadRelationshipResult).result.relationship
					.subject.object.objectId;
			});

			return objectIds;
		}

		return [
			(data as ReadRelationshipResult).result.relationship.subject.object
				.objectId,
		];
	}

	parseNDJONFromAuthzed(rawData: string): any[] {
		let parsedData: any[] = [];
		rawData.split('\n').forEach((row) => {
			if (row.length > 0) {
				parsedData.push(JSON.parse(row) as ReadRelationshipResult);
			}
		});

		return parsedData;
	}
	deleteRelationship(
		relationshipInfo: RelationShip
	): DeleteRelationshipBody {
		return {
			relationshipFilter: {
				resourceType:
					this.schemaPrefix + relationshipInfo.relationOwner.objectType,
				optionalResourceId: relationshipInfo.relationOwner.objectId,
				optionalRelation: relationshipInfo.relation,
				optionalSubjectFilter: {
					subjectType:
						this.schemaPrefix + relationshipInfo.relatedItem.objectType,
					optionalSubjectId: relationshipInfo.relatedItem.objectId,
				},
			},
		};
	}
	writeRelationship(
		relationshipInfo: RelationShip
	): WriteRelationshipBody {
		return {
			updates: [
				{
					operation: 'OPERATION_TOUCH',
					relationship: {
						resource: {
							objectType:
								this.schemaPrefix + relationshipInfo.relationOwner.objectType,
							objectId: relationshipInfo.relationOwner.objectId,
						},
						relation: relationshipInfo.relation,
						subject: {
							object: {
								objectType:
									this.schemaPrefix + relationshipInfo.relatedItem.objectType,
								objectId: relationshipInfo.relatedItem.objectId,
							},
						},
					},
				},
			],
		};
	}

	readRelationship(searchInfo: SearchInfo): SearchInfoBody {
		const { resourceType, resourceId, relation, optionalSubjectFilter } =
			searchInfo;
		const filter = optionalSubjectFilter
			? {
				subjectType: this.schemaPrefix + optionalSubjectFilter.subjectType,
				optionalSubjectId: optionalSubjectFilter.optionalSubjectId,
			}
			: optionalSubjectFilter;
		return {
			consistency: {
				minimizeLatency: true,
			},
			relationshipFilter: {
				resourceType: this.schemaPrefix + resourceType,
				optionalResourceId: resourceId,
				optionalRelation: relation,
				optionalSubjectFilter: filter,
			},
		};
	}

	checkPermission(orgId: OrgId, userId: UserId, permission: CatalystOrgPermissions): PermissionCheckRequest {
		return {
			consistency: {
				minimizeLatency: true
			},
			resource: {
				objectType: this.schemaPrefix + CatalystEntity.enum.organization,
				objectId: orgId
			},
			permission: permission,
			subject: {
				object: {
					objectType: this.schemaPrefix + CatalystEntity.enum.user,
					objectId: userId
				}
			}
		}
	}

	// might belong somewhere else, but it gets used by multiple managers and is not exposed through the api
	async getDataServiceParentOrg(): Promise<
		{ resource: string; subject: string }[]
	> {
		const body = this.readRelationship({
			resourceType: 'data_service',
			relation: 'parent',
		});
		const { data } = await this.fetcher('read', body);
		const orgs = this.parseObjectandSubjectFromResults(data);
		return orgs;
	}
}
