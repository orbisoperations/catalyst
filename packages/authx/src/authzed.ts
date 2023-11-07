import * as types from "../types";
import { UserManager, GroupManager, OrganizationManager } from "./managers";
import { AuthzedUtils } from "./authzed.utils";

export class AuthzedClient {
  utils: AuthzedUtils;
  orgManager: OrganizationManager;
  groupManager: GroupManager;
  userManager: UserManager;
  constructor(endpoint: string, token: string, schemaPrefix?: string) {
    this.utils = new AuthzedUtils(endpoint, token, schemaPrefix);
    this.orgManager = new OrganizationManager(this.utils);
    this.groupManager = new GroupManager(this.utils);
    this.userManager = new UserManager(this.utils);
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
}
