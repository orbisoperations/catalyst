import * as types from "../types";

export class AuthzedUtils {
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

  // might belong somewhere else, but it gets used by multiple managers and is not exposed through the api
  async getDataServiceParentOrg(): Promise<
    { resource: string; subject: string }[]
  > {
    const body = this.readRelationship({
      resourceType: "data_service",
      relation: "parent",
    });
    const { data } = await this.fetcher("read", body);
    const orgs = this.parseObjectandSubjectFromResults(data);
    return orgs;
  }
}
