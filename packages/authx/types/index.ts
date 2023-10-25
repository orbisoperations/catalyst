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

export type WriteRelationshipBody = {
  updates: {
    operation: "OPERATION_TOUCH";
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
