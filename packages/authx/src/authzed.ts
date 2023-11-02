type AuthzedObject = {
	objectType: String;
	objectId: String;
};
type RelationShip = {
	relationOwner: AuthzedObject;
	relation: String;
	relatedItem: AuthzedObject;
};

export interface ReadRelationshipResult {
    result: {
        readAt: {
            token: string
          }
        relationship: {
            resource: {
                objectType: string
                objectId: string
              }
            relation: string
            subject: {
                object: {
                    objectType: string
                    objectId: string
                  }
                optionalRelation: string
              }
            optionalCaveat: {
                caveatName: string
                context: string
              }
          }
      }
    error: {
        code: string
        message: string
    }
}

export interface WriteRelationshipResult {
    writtenAt?: {
        token: string
    },
    code?: number
    message?: string
}

export class AuthzedClient {
    endpoint: string
    token: string
    schemaPrefix: string


    constructor(endpoint: string, token: string, schemaPrefix?: string) {
        this.endpoint = endpoint
        this.token = token
        this.schemaPrefix = schemaPrefix?? "orbisops_tutorial/"
    }

    private headers(): object {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        }
    }
    
    writeRelationship(relationshipInfo: RelationShip) {
        return {
            updates: [
                {
                    operation: 'OPERATION_TOUCH',
                    relationship: {
                        resource: {
                            objectType: relationshipInfo.relationOwner.objectType,
                            objectId: relationshipInfo.relationOwner.objectId,
                        },
                        relation: relationshipInfo.relation,
                        subject: {
                            object: {
                                objectType: relationshipInfo.relatedItem.objectType,
                                objectId: relationshipInfo.relatedItem.objectId,
                            },
                        },
                    },
                },
            ],
        }
    }

    readRelationship(searchInfo: {
		resourceType: string;
		resourceId?: string;
		relation?: string;
		optionalSubjectFilter?: {
			subjectType: string;
			optionalSubjectId: string;
		};
	}) {
        const { resourceType, resourceId, relation, optionalSubjectFilter } = searchInfo;
        return {
            consistency: {
                minimizeLatency: true
            },
            relationshipFilter: {
                resourceType: this.schemaPrefix + resourceType,
                optionalResourceId: resourceId,
                optionalRelation: relation,
                optionalSubjectFilter,
            }
        }
    }


    async addUserToOrganization(org: string, user: string): Promise<WriteRelationshipResult> {
        const resp = await fetch(`${this.endpoint}/v1/relationships/write`, 
        {
            method: "post",
            body: JSON.stringify(this.writeRelationship({
                relationOwner: {
                    objectType: `${this.schemaPrefix}organization`,
                    objectId: org
                },
                relation: "member",
                relatedItem: {
                    objectType: `${this.schemaPrefix}user`,
                    objectId: user
                }
            })),
            headers: {
                ...this.headers()
            }
        })

        if (!resp.ok) {
            console.log("error writing to authzed")
        }

        const data = await resp.json();
        console.log('authzed write response: ', data)
        return data as WriteRelationshipResult
    }

    async listUsersInOrganization(org: string): Promise<string[]> {
        const resp = await fetch(
            `${this.endpoint}/v1/relationships/read`, 
        {
            method: "post",
            body: JSON.stringify(this.readRelationship({
                resourceType: "organization",
                resourceId: org,
                relation: "member"
            })),
            headers: {
                ...this.headers()
            }
        })

        const data = await resp.text()

        console.log("raw data", data)

        // test for Newline Delimited JSON (NDJSON)
        if (typeof data === 'string') {
            const userIds = this.parseNDJONFromAuthzed(data as string).map((result) => {
                return (result as ReadRelationshipResult).result.relationship.subject.object.objectId
            })
            return userIds
        }

        // If no NDJSON result is an object
        return [(data as ReadRelationshipResult).result.relationship.subject.object.objectId]
    }

    parseNDJONFromAuthzed(rawData: string): any[] {
        console.log(rawData)
        let parsedData: any[] = [];
        rawData.split("\n").forEach((row) => {
            if (row.length > 0) {
                parsedData.push(JSON.parse(row) as ReadRelationshipResult);
            }
        })

        return parsedData
    }
}