import * as types from "../../types";
import { AuthzedUtils } from "../authzed.utils";
export class GroupManager {
  constructor(private utils: AuthzedUtils) {}

  // groups
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
      this.utils.getDataServiceParentOrg(),
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

  async addAdminToGroup(admin: string, group: string) {
    const { data } = await this.utils.fetcher(
      "write",
      this.utils.writeRelationship({
        relationOwner: {
          objectType: `group`,
          objectId: group,
        },
        relation: "admin",
        relatedItem: {
          objectType: `user`,
          objectId: admin,
        },
      })
    );
    return data as types.WriteRelationshipResult;
  }

  async listGroupAdmins(group: string) {
    const body = this.utils.readRelationship({
      resourceType: "group",
      relation: "admin",
      resourceId: group,
    });

    const { data } = await this.utils.fetcher("read", body);
    return this.utils.parseSubjectIdsFromResults(data);
  }

  async removeAdminFromGroup(admin: string, group: string) {
    const { data } = await this.utils.fetcher(
      "delete",
      this.utils.deleteRelationship({
        relationOwner: {
          objectType: `group`,
          objectId: group,
        },
        relation: "admin",
        relatedItem: {
          objectType: `user`,
          objectId: admin,
        },
      })
    );
    return data as types.DeleteRelationshipResult;
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
}
