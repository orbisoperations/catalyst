import { Authzed, Catalyst, DataChannelId, OrgId, UserId } from '@catalyst/schemas';

export type SearchInfoBody = {
	consistency?: {
		minimizeLatency?: boolean;
		atLeastAsFresh?: {
			token: string;
		};
		atExactSnapshot?: {
			token: string;
		};
		fullyConsistent?: boolean;
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
		minimizeLatency?: boolean;
		atLeastAsFresh?: {
			token: string;
		};
		atExactSnapshot?: {
			token: string;
		};
		fullyConsistent?: boolean;
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
		minimizeLatency?: boolean;
		atLeastAsFresh?: {
			token: string;
		};
		atExactSnapshot?: {
			token: string;
		};
		fullyConsistent?: boolean;
	};
	resource: {
		objectType: string;
		objectId: string;
	};
	permission: string;
	subject: {
		object: {
			objectType: string;
			objectId: string;
		};
		optionalRelation?: string;
	};
	/**
	 * Arbitrary context passed to Authzed. Using a more specific record type
	 * avoids the ESLint `no-empty-object-type` error.
	 */
	context?: Record<string, unknown>;
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
				...this.utils.headers(),
			},
		});

		const result = (await resp.json()) as { schemaText: string; readAt: { token: string } };
		return result;
	}

	async addDataChannelToOrganization(orgId: OrgId, dataChannelId: DataChannelId): Promise<Authzed.Relationships.WriteResult> {
		const body = this.utils.writeRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: orgId,
			},
			relation: Catalyst.Org.EntityEnum.enum.data_channel,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.data_channel,
				objectId: dataChannelId,
			},
		});
		const { data } = await this.utils.fetcher('write', body);

		return Authzed.Relationships.WriteResult.parse(data);
	}
	async listDataChannelsInOrganization(orgId: OrgId, dataChannelId?: DataChannelId) {
		const body = this.utils.readRelationship({
			resourceType: Catalyst.EntityEnum.enum.organization,
			resourceId: orgId,
			relation: Catalyst.Org.EntityEnum.enum.data_channel,
			optionalSubjectFilter: dataChannelId
				? {
						subjectType: Catalyst.EntityEnum.enum.data_channel,
						optionalSubjectId: dataChannelId,
					}
				: undefined,
		});

		const { data } = await this.utils.fetcher('read', body);
		return this.utils.parseOrganizationData(data);
	}
	async deleteDataChannelInOrganization(orgId: OrgId, dataChannelId: DataChannelId): Promise<Authzed.Relationships.DeleteResult> {
		const body = this.utils.deleteRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: orgId,
			},
			relation: Catalyst.Org.EntityEnum.enum.data_channel,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.data_channel,
				objectId: dataChannelId,
			},
		});
		const { data } = await this.utils.fetcher('delete', body);
		return Authzed.Relationships.DeleteResult.parse(data);
	}

	async addPartnerToOrganization(orgId: OrgId, partnerId: OrgId): Promise<Authzed.Relationships.WriteResult> {
		const body = this.utils.writeRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: orgId,
			},
			relation: Catalyst.Org.EntityEnum.enum.partner_organization,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: partnerId,
			},
		});
		const { data } = await this.utils.fetcher('write', body);

		return Authzed.Relationships.WriteResult.parse(data);
	}
	async listPartnersInOrganization(orgId: OrgId, partnerId?: OrgId) {
		const body = this.utils.readRelationship({
			resourceType: Catalyst.EntityEnum.enum.organization,
			resourceId: orgId,
			relation: Catalyst.Org.EntityEnum.enum.partner_organization,
			optionalSubjectFilter: partnerId
				? {
						subjectType: Catalyst.EntityEnum.enum.organization,
						optionalSubjectId: partnerId,
					}
				: undefined,
		});

		const { data } = await this.utils.fetcher('read', body);
		return this.utils.parseOrganizationData(data);
	}
	async deletePartnerInOrganization(orgId: OrgId, partnerId: OrgId): Promise<Authzed.Relationships.DeleteResult> {
		const body = this.utils.deleteRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: orgId,
			},
			relation: Catalyst.Org.EntityEnum.enum.partner_organization,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: partnerId,
			},
		});
		const { data } = await this.utils.fetcher('delete', body);
		return Authzed.Relationships.DeleteResult.parse(data);
	}

	async addUserToOrganization(org: string, user: string): Promise<Authzed.Relationships.WriteResult> {
		const body = this.utils.writeRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: org,
			},
			relation: Catalyst.RoleEnum.enum.user,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.user,
				objectId: user,
			},
		});
		const { data } = await this.utils.fetcher('write', body);

		return Authzed.Relationships.WriteResult.parse(data);
	}

	async removeUserRoleFromOrganization(
		org: string,
		user: string,
		role: Catalyst.RoleEnumType,
	): Promise<Authzed.Relationships.DeleteResult> {
		const body = this.utils.deleteRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: org,
			},
			relation: role,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.user,
				objectId: user,
			},
		});
		const { data } = await this.utils.fetcher('delete', body);
		return Authzed.Relationships.DeleteResult.parse(data);
	}

	async addDataCustodianToOrganization(org: string, user: string): Promise<Authzed.Relationships.WriteResult> {
		const body = this.utils.writeRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: org,
			},
			relation: Catalyst.RoleEnum.enum.data_custodian,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.user,
				objectId: user,
			},
		});
		const { data } = await this.utils.fetcher('write', body);

		return Authzed.Relationships.WriteResult.parse(data);
	}

	async addAdminToOrganization(org: string, user: string): Promise<Authzed.Relationships.WriteResult> {
		const body = this.utils.writeRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: org,
			},
			relation: Catalyst.RoleEnum.enum.admin,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.user,
				objectId: user,
			},
		});
		const { data } = await this.utils.fetcher('write', body);

		return Authzed.Relationships.WriteResult.parse(data);
	}

	async listUsersInOrganization(
		orgId: OrgId,
		args: {
			userId?: UserId;
			roles?: Catalyst.RoleEnumType[];
		},
	) {
		const searchRoles = args.roles ?? [Catalyst.RoleEnum.enum.user, Catalyst.RoleEnum.enum.data_custodian, Catalyst.RoleEnum.enum.admin];

		const results: Catalyst.Relationship[] = [];

		for (const role of searchRoles) {
			const body = this.utils.readRelationship({
				resourceType: Catalyst.EntityEnum.enum.organization,
				resourceId: orgId,
				relation: role,
				optionalSubjectFilter: args.userId
					? {
							subjectType: Catalyst.EntityEnum.enum.user,
							optionalSubjectId: args.userId,
						}
					: undefined,
			});

			const { data } = await this.utils.fetcher('read', body);
			const result = this.utils.parseOrganizationData(data);
			results.push(...result);
		}

		return results;
	}

	async organizationPermissionsCheck(orgId: OrgId, userId: UserId, permission: Catalyst.Org.PermissionsEnum) {
		const req = this.utils.checkOrgPermission(orgId, userId, permission);
		const { data } = await this.utils.permissionFetcher(req);

		const result = Authzed.Permissions.CheckResponse.safeParse(data);
		if (!result.success) return false;
		return result.data.permissionship === Authzed.Permissions.PermissionValues.enum.PERMISSIONSHIP_HAS_PERMISSION;
	}

	async addOrganizationToDataChannel(dataChannelId: DataChannelId, orgId: OrgId): Promise<Authzed.Relationships.WriteResult> {
		const body = this.utils.writeRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.data_channel,
				objectId: dataChannelId,
			},
			relation: Catalyst.DataChannel.EntityEnum.enum.organization,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: orgId,
			},
		});
		const { data } = await this.utils.fetcher('write', body);

		return Authzed.Relationships.WriteResult.parse(data);
	}
	async listOrgsInDataChannels(dataChannelId: DataChannelId, orgId?: OrgId) {
		const body = this.utils.readRelationship({
			resourceType: Catalyst.EntityEnum.enum.data_channel,
			resourceId: dataChannelId,
			relation: Catalyst.DataChannel.EntityEnum.enum.organization,
			optionalSubjectFilter: orgId
				? {
						subjectType: Catalyst.EntityEnum.enum.organization,
						optionalSubjectId: orgId,
					}
				: undefined,
		});

		const { data } = await this.utils.fetcher('read', body);
		return this.utils.parseOrganizationData(data);
	}
	async deleteOrgInDataChannel(dataChannelId: DataChannelId, orgId: OrgId): Promise<Authzed.Relationships.DeleteResult> {
		const body = this.utils.deleteRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.data_channel,
				objectId: dataChannelId,
			},
			relation: Catalyst.DataChannel.EntityEnum.enum.organization,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: orgId,
			},
		});
		const { data } = await this.utils.fetcher('delete', body);
		return Authzed.Relationships.DeleteResult.parse(data);
	}

	async dataChannelPermissionsCheck(dataChannelId: DataChannelId, userId: UserId, permission: Catalyst.DataChannel.PermissionsEnum) {
		const req = this.utils.checkDataChannelPermission(dataChannelId, userId, permission);
		const { data } = await this.utils.permissionFetcher(req);

		const result = Authzed.Permissions.CheckResponse.safeParse(data);
		if (!result.success) {
			console.error(result.error, 'data channel permission check failed', dataChannelId, userId, permission);
			return false;
		}

		return result.data.permissionship === Authzed.Permissions.PermissionValues.enum.PERMISSIONSHIP_HAS_PERMISSION;
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
		data: SearchInfoBody | Authzed.Relationships.WriteBody | Authzed.Relationships.DeleteBody,
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
					console.log(`Error converting JSON: ${JSON.stringify(e, null, 4)}`);
					return { data: {}, success: false };
				}
			})
			.then((res) => res);
	}

	async permissionFetcher(data: PermissionCheckRequest) {
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
					console.log(`Error converting JSON: ${JSON.stringify(e, null, 4)}`);
					return { data: {}, success: false };
				}
			})
			.then((res) => res);
	}

	parseResourceIdsFromResults(data: string | unknown): string[] {
		if (typeof data === 'string') {
			const objectIds = this.parseNDJONFromAuthzed(data).map((result) => {
				return Authzed.Relationships.ReadResult.parse(result).result.relationship.resource.objectId;
			});
			return objectIds;
		}

		return [Authzed.Relationships.ReadResult.parse(data).result.relationship.resource.objectId];
	}

	parseOrganizationData(data: string | unknown): Catalyst.Relationship[] {
		const parsedArray = typeof data === 'string' ? this.parseNDJONFromAuthzed(data) : [data];
		const resp = parsedArray.map((val) => {
			return Authzed.Relationships.QueryResponse.parse(val);
		});

		return resp.map((result) => {
			return {
				object: result.result.relationship.resource.objectId,
				relation: result.result.relationship.relation as Catalyst.Relationship['relation'],
				subject: result.result.relationship.subject.object.objectId,
			};
		});
	}
	parseObjectandSubjectFromResults(data: string | unknown): { subject: string; resource: string }[] {
		if (typeof data === 'string') {
			const objectIds = this.parseNDJONFromAuthzed(data).map((result) => {
				return {
					subject: Authzed.Relationships.ReadResult.parse(result).result.relationship.subject.object.objectId,
					resource: Authzed.Relationships.ReadResult.parse(result).result.relationship.resource.objectId,
				};
			});
			return objectIds;
		}

		return [
			{
				subject: Authzed.Relationships.ReadResult.parse(data).result.relationship.subject.object.objectId,
				resource: Authzed.Relationships.ReadResult.parse(data).result.relationship.resource.objectId,
			},
		];
	}
	parseSubjectIdsFromResults(data: string | unknown): string[] {
		if (typeof data === 'string') {
			const objectIds = this.parseNDJONFromAuthzed(data).map((result) => {
				return Authzed.Relationships.ReadResult.parse(result).result.relationship.subject.object.objectId;
			});

			return objectIds;
		}

		return [Authzed.Relationships.ReadResult.parse(data).result.relationship.subject.object.objectId];
	}

	parseNDJONFromAuthzed(rawData: string): unknown[] {
		const parsedData: unknown[] = [];
		rawData.split('\n').forEach((row) => {
			if (row.length > 0) {
				parsedData.push(JSON.parse(row) as Authzed.Relationships.ReadResult);
			}
		});

		return parsedData;
	}
	deleteRelationship(relationshipInfo: Authzed.Relationships.Relationship): Authzed.Relationships.DeleteBody {
		return {
			relationshipFilter: {
				resourceType: (this.schemaPrefix + relationshipInfo.relationOwner.objectType) as unknown as Catalyst.EntityEnumType,
				optionalResourceId: relationshipInfo.relationOwner.objectId,
				optionalRelation: relationshipInfo.relation,
				optionalSubjectFilter: {
					subjectType: (this.schemaPrefix + relationshipInfo.relatedItem.objectType) as unknown as Catalyst.EntityEnumType,
					optionalSubjectId: relationshipInfo.relatedItem.objectId,
				},
			},
		};
	}
	writeRelationship(relationshipInfo: Authzed.Relationships.Relationship): Authzed.Relationships.WriteBody {
		return {
			updates: [
				{
					operation: 'OPERATION_TOUCH',
					relationship: {
						resource: {
							objectType: (this.schemaPrefix + relationshipInfo.relationOwner.objectType) as unknown as Catalyst.EntityEnumType,
							objectId: relationshipInfo.relationOwner.objectId,
						},
						relation: relationshipInfo.relation,
						subject: {
							object: {
								objectType: (this.schemaPrefix + relationshipInfo.relatedItem.objectType) as unknown as Catalyst.EntityEnumType,
								objectId: relationshipInfo.relatedItem.objectId,
							},
						},
					},
				},
			],
		};
	}

	readRelationship(searchInfo: Authzed.Relationships.SearchInfo): SearchInfoBody {
		const { resourceType, resourceId, relation, optionalSubjectFilter } = searchInfo;
		const filter:
			| {
					subjectType: string;
					optionalSubjectId: string;
			  }
			| undefined = optionalSubjectFilter
			? {
					subjectType: (this.schemaPrefix + optionalSubjectFilter.subjectType) as unknown as string,
					optionalSubjectId: optionalSubjectFilter.optionalSubjectId,
				}
			: undefined;
		return {
			consistency: {
				fullyConsistent: true,
			},
			relationshipFilter: {
				resourceType: (this.schemaPrefix + resourceType) as unknown as Catalyst.EntityEnumType,
				optionalResourceId: resourceId,
				optionalRelation: relation,
				optionalSubjectFilter: filter,
			},
		};
	}

	checkOrgPermission(orgId: OrgId, userId: UserId, permission: Catalyst.Org.PermissionsEnum): PermissionCheckRequest {
		return {
			consistency: {
				fullyConsistent: true,
			},
			resource: {
				objectType: (this.schemaPrefix + Catalyst.EntityEnum.enum.organization) as unknown as Catalyst.EntityEnumType,
				objectId: orgId,
			},
			permission: permission,
			subject: {
				object: {
					objectType: (this.schemaPrefix + Catalyst.EntityEnum.enum.user) as unknown as Catalyst.EntityEnumType,
					objectId: userId,
				},
			},
		};
	}

	checkDataChannelPermission(
		dataChannelId: DataChannelId,
		userId: UserId,
		permission: Catalyst.DataChannel.PermissionsEnum,
	): PermissionCheckRequest {
		return {
			consistency: {
				fullyConsistent: true,
			},
			resource: {
				objectType: (this.schemaPrefix + Catalyst.EntityEnum.enum.data_channel) as unknown as Catalyst.EntityEnumType,
				objectId: dataChannelId,
			},
			permission: permission,
			subject: {
				object: {
					objectType: (this.schemaPrefix + Catalyst.EntityEnum.enum.user) as unknown as Catalyst.EntityEnumType,
					objectId: userId,
				},
			},
		};
	}
}
