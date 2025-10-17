import { Authzed, Catalyst, DataChannelId, OrgId, UserId } from '@catalyst/schema_zod';

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

	async removeUserRoleFromOrganization(org: string, user: string, role: Catalyst.RoleEnum): Promise<Authzed.Relationships.DeleteResult> {
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
			roles?: Catalyst.RoleEnum[];
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

	// ==================================================================================
	// Channel Share Methods (Granular Shares)
	// ==================================================================================

	/**
	 * Grant permission for a partner organization to access a specific data channel
	 * Creates a channel_share entity linking the channel to the partner
	 * @param channelId - The data channel ID to share
	 * @param partnerOrgId - The partner organization ID to grant access
	 * @returns WriteResult with the created share ID
	 */
	async addChannelShare(channelId: DataChannelId, partnerOrgId: OrgId): Promise<Authzed.Relationships.WriteResult> {
		// Generate composite ID for the share entity (using | separator as per AuthZed ObjectId regex)
		const shareId = `${channelId}|${partnerOrgId}`;

		// Create the share entity with bidirectional relationships
		const channelRelationBody = this.utils.writeRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.channel_share,
				objectId: shareId,
			},
			relation: Catalyst.ChannelShare.EntityEnum.enum.channel,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.data_channel,
				objectId: channelId,
			},
		});

		const partnerRelationBody = this.utils.writeRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.channel_share,
				objectId: shareId,
			},
			relation: Catalyst.ChannelShare.EntityEnum.enum.partner,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: partnerOrgId,
			},
		});

		// Create the reverse relationship: data_channel -> shared_with -> channel_share
		// This is required for the read_by_share permission to work
		const sharedWithRelationBody = this.utils.writeRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.data_channel,
				objectId: channelId,
			},
			relation: Catalyst.DataChannel.EntityEnum.enum.shared_with,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.channel_share,
				objectId: shareId,
			},
		});

		// Write all three relationships in sequence
		// TODO: Consider using batch write API for atomic operation
		const channelResult = await this.utils.fetcher('write', channelRelationBody);
		if (!channelResult.success) {
			throw new Error(`Failed to create channel relationship for share ${shareId}`);
		}

		const partnerResult = await this.utils.fetcher('write', partnerRelationBody);
		if (!partnerResult.success) {
			throw new Error(`Failed to create partner relationship for share ${shareId}`);
		}

		const sharedWithResult = await this.utils.fetcher('write', sharedWithRelationBody);
		if (!sharedWithResult.success) {
			throw new Error(`Failed to create shared_with relationship for share ${shareId}`);
		}

		return Authzed.Relationships.WriteResult.parse(sharedWithResult.data);
	}

	/**
	 * Revoke permission for a partner organization to access a specific data channel
	 * Deletes the channel_share entity and all its relationships
	 * @param channelId - The data channel ID
	 * @param partnerOrgId - The partner organization ID
	 * @returns DeleteResult indicating success
	 */
	async removeChannelShare(channelId: DataChannelId, partnerOrgId: OrgId): Promise<Authzed.Relationships.DeleteResult> {
		const shareId = `${channelId}|${partnerOrgId}`;

		// Delete all three relationships for this share entity
		// 1. channel_share -> channel
		const channelBody = this.utils.deleteRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.channel_share,
				objectId: shareId,
			},
			relation: Catalyst.ChannelShare.EntityEnum.enum.channel,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.data_channel,
				objectId: channelId,
			},
		});

		// 2. channel_share -> partner
		const partnerBody = this.utils.deleteRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.channel_share,
				objectId: shareId,
			},
			relation: Catalyst.ChannelShare.EntityEnum.enum.partner,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.organization,
				objectId: partnerOrgId,
			},
		});

		// 3. data_channel -> shared_with
		const sharedWithBody = this.utils.deleteRelationship({
			relationOwner: {
				objectType: Catalyst.EntityEnum.enum.data_channel,
				objectId: channelId,
			},
			relation: Catalyst.DataChannel.EntityEnum.enum.shared_with,
			relatedItem: {
				objectType: Catalyst.EntityEnum.enum.channel_share,
				objectId: shareId,
			},
		});

		// Execute all deletes (AuthZed deletes are idempotent)
		await this.utils.fetcher('delete', channelBody);
		await this.utils.fetcher('delete', partnerBody);
		const sharedWithResult = await this.utils.fetcher('delete', sharedWithBody);

		// Return the last result (all should have same deletedAt token)
		return Authzed.Relationships.DeleteResult.parse(sharedWithResult.data);
	}

	/**
	 * List all partner organizations that have been granted access to a specific channel
	 * @param channelId - The data channel ID to query
	 * @param partnerOrgId - Optional: filter by specific partner org
	 * @returns Array of partner organization IDs that can access this channel
	 */
	async listChannelPartners(channelId: DataChannelId, partnerOrgId?: OrgId): Promise<string[]> {
		// Query from the data_channel's perspective using the shared_with relation
		const body = this.utils.readRelationship({
			resourceType: Catalyst.EntityEnum.enum.data_channel,
			resourceId: channelId,
			relation: Catalyst.DataChannel.EntityEnum.enum.shared_with,
			optionalSubjectFilter: undefined,
		});

		const { data } = await this.utils.fetcher('read', body);

		if (!data || (typeof data === 'string' && data.trim() === '')) {
			return [];
		}

		// Extract share IDs (format: "channelId|partnerOrgId")
		const shareIds = this.utils.parseSubjectIdsFromResults(data);

		// Extract partner org IDs from the composite keys
		const partnerOrgIds = shareIds.map((id) => {
			const parts = id.split('|');
			return parts[1]; // Return the partnerOrgId portion
		});

		// Filter by specific partner if requested
		if (partnerOrgId) {
			return partnerOrgIds.filter((id) => id === partnerOrgId);
		}

		return partnerOrgIds;
	}

	/**
	 * List all data channels that a partner organization has been granted access to
	 * @param partnerOrgId - The partner organization ID to query
	 * @param channelId - Optional: check if partner has access to specific channel
	 * @returns Array of data channel IDs that the partner can access
	 */
	async listPartnerChannels(partnerOrgId: OrgId, channelId?: DataChannelId): Promise<string[]> {
		const body = this.utils.readRelationship({
			resourceType: Catalyst.EntityEnum.enum.channel_share,
			resourceId: undefined, // Query all share entities
			relation: Catalyst.ChannelShare.EntityEnum.enum.partner,
			optionalSubjectFilter: {
				subjectType: Catalyst.EntityEnum.enum.organization,
				optionalSubjectId: partnerOrgId,
			},
		});

		const { data } = await this.utils.fetcher('read', body);

		if (!data || (typeof data === 'string' && data.trim() === '')) {
			return [];
		}

		// Extract share IDs (format: "channelId|partnerOrgId")
		const shareIds = this.utils.parseResourceIdsFromResults(data);

		// Extract channel IDs from the composite keys
		const channelIds = shareIds.map((id) => {
			const parts = id.split('|');
			return parts[0]; // Return the channelId portion
		});

		// Filter by specific channel if requested
		if (channelId) {
			return channelIds.filter((id) => id === channelId);
		}

		return channelIds;
	}

	/**
	 * Check if a specific channel share exists (helper method)
	 * @param channelId - The data channel ID
	 * @param partnerOrgId - The partner organization ID
	 * @returns Boolean indicating if the share exists
	 */
	async channelShareExists(channelId: DataChannelId, partnerOrgId: OrgId): Promise<boolean> {
		const partners = await this.listChannelPartners(channelId, partnerOrgId);
		return partners.length > 0;
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
			const parsedResults = this.parseNDJONFromAuthzed(data);
			const objectIds: string[] = [];

			for (const result of parsedResults) {
				const parsed = Authzed.Relationships.QueryResponse.safeParse(result);
				if (parsed.success) {
					objectIds.push(parsed.data.result.relationship.resource.objectId);
				}
			}

			return objectIds;
		}

		const parsed = Authzed.Relationships.QueryResponse.safeParse(data);
		if (parsed.success) {
			return [parsed.data.result.relationship.resource.objectId];
		}
		return [];
	}

	parseOrganizationData(data: string | unknown): Catalyst.Relationship[] {
		const parsedArray = typeof data === 'string' ? this.parseNDJONFromAuthzed(data) : [data];
		const relationships: Catalyst.Relationship[] = [];

		for (const val of parsedArray) {
			const parsed = Authzed.Relationships.QueryResponse.safeParse(val);
			if (parsed.success) {
				relationships.push({
					object: parsed.data.result.relationship.resource.objectId,
					relation: parsed.data.result.relationship.relation,
					subject: parsed.data.result.relationship.subject.object.objectId,
				});
			}
		}

		return relationships;
	}
	parseObjectandSubjectFromResults(data: string | unknown): { subject: string; resource: string }[] {
		if (typeof data === 'string') {
			const parsedResults = this.parseNDJONFromAuthzed(data);
			const objectIds: { subject: string; resource: string }[] = [];

			for (const result of parsedResults) {
				const parsed = Authzed.Relationships.QueryResponse.safeParse(result);
				if (parsed.success) {
					objectIds.push({
						subject: parsed.data.result.relationship.subject.object.objectId,
						resource: parsed.data.result.relationship.resource.objectId,
					});
				}
			}

			return objectIds;
		}

		const parsed = Authzed.Relationships.QueryResponse.safeParse(data);
		if (parsed.success) {
			return [
				{
					subject: parsed.data.result.relationship.subject.object.objectId,
					resource: parsed.data.result.relationship.resource.objectId,
				},
			];
		}
		return [];
	}
	parseSubjectIdsFromResults(data: string | unknown): string[] {
		if (typeof data === 'string') {
			const parsedResults = this.parseNDJONFromAuthzed(data);
			const objectIds: string[] = [];

			for (const result of parsedResults) {
				const parsed = Authzed.Relationships.QueryResponse.safeParse(result);
				if (parsed.success) {
					objectIds.push(parsed.data.result.relationship.subject.object.objectId);
				}
			}

			return objectIds;
		}

		const parsed = Authzed.Relationships.QueryResponse.safeParse(data);
		if (parsed.success) {
			return [parsed.data.result.relationship.subject.object.objectId];
		}
		return [];
	}

	parseNDJONFromAuthzed(rawData: string): unknown[] {
		const parsedData: unknown[] = [];
		rawData.split('\n').forEach((row) => {
			if (row.trim().length > 0) {
				try {
					parsedData.push(JSON.parse(row));
				} catch (e) {
					console.error('Failed to parse NDJSON row:', row, e);
					// Skip invalid JSON rows
				}
			}
		});

		return parsedData;
	}
	deleteRelationship(relationshipInfo: Authzed.Relationships.Relationship): Authzed.Relationships.DeleteBody {
		return {
			relationshipFilter: {
				resourceType: (this.schemaPrefix + relationshipInfo.relationOwner.objectType) as unknown as Catalyst.EntityEnum,
				optionalResourceId: relationshipInfo.relationOwner.objectId,
				optionalRelation: relationshipInfo.relation,
				optionalSubjectFilter: {
					subjectType: (this.schemaPrefix + relationshipInfo.relatedItem.objectType) as unknown as Catalyst.EntityEnum,
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
							objectType: (this.schemaPrefix + relationshipInfo.relationOwner.objectType) as unknown as Catalyst.EntityEnum,
							objectId: relationshipInfo.relationOwner.objectId,
						},
						relation: relationshipInfo.relation,
						subject: {
							object: {
								objectType: (this.schemaPrefix + relationshipInfo.relatedItem.objectType) as unknown as Catalyst.EntityEnum,
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
		const filter = optionalSubjectFilter
			? {
					subjectType: (this.schemaPrefix + optionalSubjectFilter.subjectType) as unknown as Catalyst.EntityEnum,
					optionalSubjectId: optionalSubjectFilter.optionalSubjectId,
				}
			: optionalSubjectFilter;
		return {
			consistency: {
				fullyConsistent: true,
			},
			relationshipFilter: {
				resourceType: (this.schemaPrefix + resourceType) as unknown as Catalyst.EntityEnum,
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
				objectType: (this.schemaPrefix + Catalyst.EntityEnum.enum.organization) as unknown as Catalyst.EntityEnum,
				objectId: orgId,
			},
			permission: permission,
			subject: {
				object: {
					objectType: (this.schemaPrefix + Catalyst.EntityEnum.enum.user) as unknown as Catalyst.EntityEnum,
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
				objectType: (this.schemaPrefix + Catalyst.EntityEnum.enum.data_channel) as unknown as Catalyst.EntityEnum,
				objectId: dataChannelId,
			},
			permission: permission,
			subject: {
				object: {
					objectType: (this.schemaPrefix + Catalyst.EntityEnum.enum.user) as unknown as Catalyst.EntityEnum,
					objectId: userId,
				},
			},
		};
	}
}
