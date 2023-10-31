import * as types from "../types";

class AuthzedUtils {
  endpoint: string;
  token: string;
  schemaPrefix: string;

  constructor(endpoint: string, token: string, schemaPrefix?: string) {
    this.endpoint = endpoint;
    this.token = token;

    this.schemaPrefix = schemaPrefix ?? "orbisops_tutorial/";
  }

  headers(): object {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    };
  }

  async fetcher(
    action: "read" | "write" | "delete",
    data:
      | types.SearchInfoBody
      | types.WriteRelationshipBody
      | types.DeleteRelationshipBody
  ) {
    return await fetch(`${this.endpoint}/v1/relationships/${action}`, {
      method: "POST",
      headers: {
        ...this.headers(),
      },
      body: JSON.stringify(data),
    })
      .then(async (res) => {
        try {
          return {
            data: action == "read" ? await res.text() : await res.json(),
            success: true,
          };
        } catch (e) {
          return { data: {}, success: false };
        }
      })
      .then((res) => res);
  }
  parseResourceIdsFromResults(data: any): string[] | PromiseLike<string[]> {
    if (typeof data === "string") {
      const objectIds = this.parseNDJONFromAuthzed(data).map((result) => {
        return (result as types.ReadRelationshipResult).result.relationship
          .resource.objectId;
      });
      return objectIds;
    }

    return [
      (data as types.ReadRelationshipResult).result.relationship.resource
        .objectId,
    ];
  }

  parseObjectandSubjectFromResults(
    data: any
  ):
    | { subject: string; resource: string }[]
    | PromiseLike<{ subject: string; resource: string }[]> {
    if (typeof data === "string") {
      const objectIds = this.parseNDJONFromAuthzed(data).map((result) => {
        return {
          subject: (result as types.ReadRelationshipResult).result.relationship
            .subject.object.objectId,
          resource: (result as types.ReadRelationshipResult).result.relationship
            .resource.objectId,
        };
      });
      return objectIds;
    }

    return [
      {
        subject: (data as types.ReadRelationshipResult).result.relationship
          .subject.object.objectId,
        resource: (data as types.ReadRelationshipResult).result.relationship
          .resource.objectId,
      },
    ];
  }
  parseSubjectIdsFromResults(data: any): string[] | PromiseLike<string[]> {
    if (typeof data === "string") {
      const objectIds = this.parseNDJONFromAuthzed(data).map((result) => {
        return (result as types.ReadRelationshipResult).result.relationship
          .subject.object.objectId;
      });

      return objectIds;
    }

    return [
      (data as types.ReadRelationshipResult).result.relationship.subject.object
        .objectId,
    ];
  }

  parseNDJONFromAuthzed(rawData: string): any[] {
    let parsedData: any[] = [];
    rawData.split("\n").forEach((row) => {
      if (row.length > 0) {
        parsedData.push(JSON.parse(row) as types.ReadRelationshipResult);
      }
    });

    return parsedData;
  }
  deleteRelationship(
    relationshipInfo: types.RelationShip
  ): types.DeleteRelationshipBody {
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
    relationshipInfo: types.RelationShip
  ): types.WriteRelationshipBody {
    return {
      updates: [
        {
          operation: "OPERATION_TOUCH",
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

  readRelationship(searchInfo: types.SearchInfo): types.SearchInfoBody {
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
}

export class AuthzedClient {
  utils: AuthzedUtils;

  constructor(endpoint: string, token: string, schemaPrefix?: string) {
    this.utils = new AuthzedUtils(endpoint, token, schemaPrefix);
  }
  async addAdminToOrganization(org: string, user: string) {
    const { data } = await this.utils.fetcher(
      "write",
      this.utils.writeRelationship({
        relationOwner: {
          objectType: `organization`,
          objectId: org,
        },
        relation: "admin",
        relatedItem: {
          objectType: `user`,
          objectId: user,
        },
      })
    );
    return data as types.WriteRelationshipResult;
  }
  async addUserToOrganization(
    org: string,
    user: string,
    isOwner?: boolean
  ): Promise<types.WriteRelationshipResult> {
    const body = this.utils.writeRelationship({
      relationOwner: {
        objectType: `organization`,
        objectId: org,
      },
      relation: isOwner ? "owner" : "member",
      relatedItem: {
        objectType: `user`,
        objectId: user,
      },
    });
    const { data } = await this.utils.fetcher("write", body);

    return data as types.WriteRelationshipResult;
  }
  async addDataServiceToOrganization(
    dataService: string,
    org: string
  ): Promise<types.WriteRelationshipResult> {
    const { data } = await this.utils.fetcher(
      "write",
      this.utils.writeRelationship({
        relationOwner: {
          objectType: "data_service",
          objectId: dataService,
        },
        relation: "parent",
        relatedItem: {
          objectType: "organization",
          objectId: org,
        },
      })
    );
    return data as types.WriteRelationshipResult;
  }
  async removeDataServiceFromOrganization(
    dataService: string,
    org: string
  ): Promise<types.DeleteRelationshipResult> {
    const body = this.utils.deleteRelationship({
      relationOwner: {
        objectType: "data_service",
        objectId: dataService,
      },
      relation: "parent",
      relatedItem: {
        objectType: "organization",
        objectId: org,
      },
    });
    const { data } = await this.utils.fetcher("delete", body);
    return data as types.DeleteRelationshipResult;
  }
  async removeAdminFromOrganization(org: string, user: string) {
    const body = this.utils.deleteRelationship({
      relationOwner: {
        objectType: `organization`,
        objectId: org,
      },
      relation: "admin",
      relatedItem: {
        objectType: `user`,
        objectId: user,
      },
    });
    const { data } = await this.utils.fetcher("delete", body);
    return data as types.DeleteRelationshipResult;
  }

  async addOwnerToDataService(user: string, dataService: string) {
    const { data } = await this.utils.fetcher(
      "write",
      this.utils.writeRelationship({
        relationOwner: {
          objectType: `data_service`,
          objectId: dataService,
        },
        relation: "owner",
        relatedItem: {
          objectType: `user`,
          objectId: user,
        },
      })
    );
    return data as types.WriteRelationshipResult;
  }

  async addServiceAccountToGroup(serviceAccount: string, group: string) {
    const { data } = await this.utils.fetcher(
      "write",
      this.utils.writeRelationship({
        relationOwner: {
          objectType: `group`,
          objectId: group,
        },
        relation: "service_account",
        relatedItem: {
          objectType: `service_account`,
          objectId: serviceAccount,
        },
      })
    );
    return data as types.WriteRelationshipResult;
  }
  async addOrganizationToGroup(organization: string, group: string) {
    const body = this.utils.writeRelationship({
      relationOwner: {
        objectType: `group`,
        objectId: group,
      },
      relation: "organization",
      relatedItem: {
        objectType: `organization`,
        objectId: organization,
      },
    });
    const { data } = await this.utils.fetcher("write", body);
    return data as types.WriteRelationshipResult;
  }
  async removeUserFromGroup(user: string, group: string) {
    const body = this.utils.deleteRelationship({
      relationOwner: {
        objectType: `group`,
        objectId: group,
      },
      relation: "member",
      relatedItem: {
        objectType: `user`,
        objectId: user,
      },
    });
    const { data } = await this.utils.fetcher("delete", body);
    return data as types.DeleteRelationshipResult;
  }
  async addUserToGroup(user: string, group: string, isOwner?: boolean) {
    const body = this.utils.writeRelationship({
      relationOwner: {
        objectType: `group`,
        objectId: group,
      },
      relation: isOwner ? "owner" : "member",
      relatedItem: {
        objectType: `user`,
        objectId: user,
      },
    });
    const { data } = await this.utils.fetcher("write", body);
    return data as types.WriteRelationshipResult;
  }

  async listUsersInOrganization(org: string): Promise<string[]> {
    const { data } = await this.utils.fetcher(
      "read",
      this.utils.readRelationship({
        resourceType: "organization",
        resourceId: org,
        relation: "member",
      })
    );

    return this.utils.parseSubjectIdsFromResults(data);
  }
  async listAdminsInOrganization(org: string): Promise<string[]> {
    const { data } = await this.utils.fetcher(
      "read",
      this.utils.readRelationship({
        resourceType: "organization",
        relation: "admin",
        resourceId: org,
      })
    );

    return this.utils.parseSubjectIdsFromResults(data);
  }

  async getUserInfo(user: string): Promise<{
    organizations?: string[];
    groups?: string[];
    ownedGroups?: string[];
    ownedOrganizations?: string[];
    ownedDataServices?: string[];
    dataServices?: string[];
  }> {
    const promises = await Promise.allSettled([
      this.getDataServiceParentOrg(),
      this.getUserOrganizations(user),
      this.getUserOwnedOrganizations(user),
      this.getUserGroups(user),
      this.getUserOwnedGroups(user),
      this.getUserOwnedDataServices(user),
    ]);
    const dataServices =
      promises[0].status === "fulfilled" ? promises[0].value : [];
    const organizations =
      promises[1].status === "fulfilled" ? promises[1].value : [];
    const ownedOrganizations =
      promises[2].status === "fulfilled" ? promises[2].value : [];
    const groups = promises[3].status === "fulfilled" ? promises[3].value : [];
    const ownedGroups =
      promises[4].status === "fulfilled" ? promises[4].value : [];
    const ownedDataServices =
      promises[5].status === "fulfilled" ? promises[5].value : [];
    const orgServices = dataServices.filter((service) => {
      return (
        organizations.includes(service.subject) ||
        ownedOrganizations.includes(service.subject)
      );
    });
    const response = {
      organizations,
      ownedOrganizations,
      groups,
      ownedGroups,
      ownedDataServices,
      dataServices: orgServices.map((service) => service.resource),
    };

    return response;
  }
  // read group data (users, service accounts, and data repos it has access to).
  async getGroupInfo(group: string): Promise<{
    users?: string[];
    serviceAccounts?: string[];
    dataServices?: string[];
    organizations?: string[];
  }> {
    let dataServices: string[] = [];
    const res = await Promise.allSettled([
      this.getGroupUsers(group),
      this.getGroupServiceAccounts(group),
      this.getGroupDataServices(group),
      this.getGroupOrganization(group),
      this.getDataServiceParentOrg(),
    ]);
    const groupOrg = res[3].status === "fulfilled" ? res[3].value : undefined;
    const orgServices =
      res[4].status === "fulfilled" ? res[4].value : undefined;

    if (groupOrg && orgServices) {
      const services = orgServices.filter((service) => {
        return groupOrg.includes(service.subject);
      });
      dataServices = services.map((service) => service.resource);
    }

    const response = {
      users: res[0].status === "fulfilled" ? res[0].value : undefined,
      serviceAccounts: res[1].status === "fulfilled" ? res[1].value : undefined,
      dataServices,
      organizations: res[3].status === "fulfilled" ? res[3].value : undefined,
    };
    return response;
  }
  async getUserGroups(user: string): Promise<string[]> {
    const { data } = await this.utils.fetcher(
      "read",
      this.utils.readRelationship({
        resourceType: "group",
        relation: "member",
        optionalSubjectFilter: {
          subjectType: "user",
          optionalSubjectId: user,
        },
      })
    );

    return this.utils.parseResourceIdsFromResults(data);
  }

  async getUserOrganizations(user: string): Promise<string[]> {
    const body = this.utils.readRelationship({
      resourceType: "organization",
      relation: "member",
      optionalSubjectFilter: {
        subjectType: "user",
        optionalSubjectId: user,
      },
    });
    const { data } = await this.utils.fetcher("read", body);
    return this.utils.parseResourceIdsFromResults(data);
  }

  async getUserOwnedGroups(user: string): Promise<string[]> {
    const body = this.utils.readRelationship({
      resourceType: "group",
      relation: "owner",
      optionalSubjectFilter: {
        subjectType: "user",
        optionalSubjectId: user,
      },
    });
    const { data } = await this.utils.fetcher("read", body);
    const response = this.utils.parseResourceIdsFromResults(data);
    return response;
  }

  async getUserOwnedOrganizations(user: string): Promise<string[]> {
    const { data } = await this.utils.fetcher(
      "read",
      this.utils.readRelationship({
        resourceType: "organization",
        relation: "owner",
        optionalSubjectFilter: {
          subjectType: "user",
          optionalSubjectId: user,
        },
      })
    );

    return this.utils.parseResourceIdsFromResults(data);
  }
  async getUserOwnedDataServices(user: string): Promise<string[]> {
    const { data } = await this.utils.fetcher(
      "read",
      this.utils.readRelationship({
        resourceType: "data_service",
        relation: "owner",
        optionalSubjectFilter: {
          subjectType: "user",
          optionalSubjectId: user,
        },
      })
    );

    return this.utils.parseResourceIdsFromResults(data);
  }
  async getDataServiceParentOrg(): Promise<
    { resource: string; subject: string }[]
  > {
    const body = this.utils.readRelationship({
      resourceType: "data_service",
      relation: "parent",
    });
    const { data } = await this.utils.fetcher("read", body);
    const orgs = this.utils.parseObjectandSubjectFromResults(data);
    return orgs;
  }

  async getGroupOrganization(group: string): Promise<string[]> {
    const body = this.utils.readRelationship({
      resourceType: "group",
      relation: "organization",
      resourceId: group,
    });

    const { data } = await this.utils.fetcher("read", body);
    return this.utils.parseSubjectIdsFromResults(data);
  }
  async getGroupDataServices(group: string): Promise<string[]> {
    const body = this.utils.readRelationship({
      resourceType: "group",
      relation: "data_service",
      resourceId: group,
    });

    const { data } = await this.utils.fetcher("read", body);
    return this.utils.parseResourceIdsFromResults(data);
  }
  async getGroupServiceAccounts(group: string): Promise<string[]> {
    const body = this.utils.readRelationship({
      resourceType: "group",
      relation: "service_account",
      resourceId: group,
    });

    const { data } = await this.utils.fetcher("read", body);

    return this.utils.parseSubjectIdsFromResults(data);
  }
  async getGroupUsers(group: string): Promise<string[]> {
    const body = this.utils.readRelationship({
      resourceType: "group",
      relation: "member",
      resourceId: group,
    });

    const { data } = await this.utils.fetcher("read", body);

    return this.utils.parseSubjectIdsFromResults(data);
  }

  async getOrganizationAdmins(org: string): Promise<string[]> {
    const body = this.utils.readRelationship({
      resourceType: "organization",
      relation: "admin",
      resourceId: org,
    });
    const data = await this.utils.fetcher("read", body);
    return this.utils.parseSubjectIdsFromResults(data);
  }
}
