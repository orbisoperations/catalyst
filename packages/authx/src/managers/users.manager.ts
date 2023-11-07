import { AuthzedUtils } from "../authzed.utils";
import * as types from "../../types";

export class UserManager {
  constructor(private utils: AuthzedUtils) {}
  // users
  async getUserInfo(user: string): Promise<{
    organizations?: string[];
    groups?: string[];
    ownedGroups?: string[];
    ownedOrganizations?: string[];
    ownedDataServices?: string[];
    dataServices?: string[];
  }> {
    const promises = await Promise.allSettled([
      this.utils.getDataServiceParentOrg(),
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
}
