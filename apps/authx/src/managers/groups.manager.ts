import { AuthzedUtils, WriteRelationshipResult, DeleteRelationshipResult } from "ozguard";
export class GroupManager {
  //constructor(private utils: AuthzedUtils) {}

  // groups
  async getGroupInfo(utils: AuthzedUtils, group: string): Promise<{
    users?: string[];
    serviceAccounts?: string[];
    dataServices?: string[];
    organizations?: string[];
  }> {
    let dataServices: string[] = [];
    const res = await Promise.allSettled([
      this.getGroupUsers(utils, group),
      this.getGroupServiceAccounts(utils, group),
      this.getGroupDataServices(utils, group),
      this.getGroupOrganization(utils, group),
      utils.getDataServiceParentOrg(),
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

  async addAdminToGroup(utils: AuthzedUtils, admin: string, group: string) {
    const { data } = await utils.fetcher(
      "write",
      utils.writeRelationship({
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
    return data as WriteRelationshipResult;
  }

  async listGroupAdmins(utils: AuthzedUtils, group: string) {
    const body = utils.readRelationship({
      resourceType: "group",
      relation: "admin",
      resourceId: group,
    });

    const { data } = await utils.fetcher("read", body);
    return utils.parseSubjectIdsFromResults(data);
  }

  async removeAdminFromGroup(utils: AuthzedUtils, admin: string, group: string) {
    const { data } = await utils.fetcher(
      "delete",
      utils.deleteRelationship({
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
    return data as DeleteRelationshipResult;
  }
  async addOrganizationToGroup(utils: AuthzedUtils, organization: string, group: string) {
    const body = utils.writeRelationship({
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
    const { data } = await utils.fetcher("write", body);
    return data as WriteRelationshipResult;
  }

  async getGroupOrganization(utils: AuthzedUtils, group: string): Promise<string[]> {
    const body = utils.readRelationship({
      resourceType: "group",
      relation: "organization",
      resourceId: group,
    });

    const { data } = await utils.fetcher("read", body);
    return utils.parseSubjectIdsFromResults(data);
  }
  async getGroupDataServices(utils: AuthzedUtils, group: string): Promise<string[]> {
    const body = utils.readRelationship({
      resourceType: "group",
      relation: "data_service",
      resourceId: group,
    });

    const { data } = await utils.fetcher("read", body);
    return utils.parseResourceIdsFromResults(data);
  }
  async getGroupServiceAccounts(utils: AuthzedUtils, group: string): Promise<string[]> {
    const body = utils.readRelationship({
      resourceType: "group",
      relation: "service_account",
      resourceId: group,
    });

    const { data } = await utils.fetcher("read", body);

    return utils.parseSubjectIdsFromResults(data);
  }
  async getGroupUsers(utils: AuthzedUtils, group: string): Promise<string[]> {
    const body = utils.readRelationship({
      resourceType: "group",
      relation: "member",
      resourceId: group,
    });

    const { data } = await utils.fetcher("read", body);

    return utils.parseSubjectIdsFromResults(data);
  }
  async addServiceAccountToGroup(utils: AuthzedUtils, serviceAccount: string, group: string) {
    const { data } = await utils.fetcher(
      "write",
      utils.writeRelationship({
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
    return data as WriteRelationshipResult;
  }
}
