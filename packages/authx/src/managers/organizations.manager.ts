import { AuthzedUtils } from "../authzed.utils";
import * as types from "../../types";

export class OrganizationManager {
  constructor(private utils: AuthzedUtils) {}
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

  async addServiceAccountToOrganization(
    serviceAccount: string,
    org: string
  ): Promise<types.WriteRelationshipResult> {
    const { data } = await this.utils.fetcher(
      "write",
      this.utils.writeRelationship({
        relationOwner: {
          objectType: "organization",
          objectId: org,
        },
        relation: "service_account",
        relatedItem: {
          objectType: "service_account",
          objectId: serviceAccount,
        },
      })
    );
    return data as types.WriteRelationshipResult;
  }

  async removeServiceAccountFromOrganization(
    serviceAccount: string,
    org: string
  ): Promise<types.DeleteRelationshipResult> {
    const body = this.utils.deleteRelationship({
      relationOwner: {
        objectType: "organization",
        objectId: org,
      },
      relation: "service_account",
      relatedItem: {
        objectType: "service_account",
        objectId: serviceAccount,
      },
    });
    const { data } = await this.utils.fetcher("delete", body);
    return data as types.DeleteRelationshipResult;
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
  async listServiceAccountsInOrganization(org: string): Promise<string[]> {
    const { data } = await this.utils.fetcher(
      "read",
      this.utils.readRelationship({
        resourceType: "organization",
        relation: "service_account",
        resourceId: org,
      })
    );

    return this.utils.parseSubjectIdsFromResults(data);
  }
}
