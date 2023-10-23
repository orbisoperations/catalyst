import axios from "axios"
import {Buffer} from "buffer"

type AuthzedObject = {
	objectType: String;
	objectId: String;
};
type RelationShip = {
	relationOwner: AuthzedObject;
	relation: String;
	relatedItem: AuthzedObject;
};
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


    async AddUserToOrganization(org: string, user: string): Promise<any> {
        const {data} = await axios.post(`${this.endpoint}/v1/relationships/write`, 
        this.writeRelationship({
            relationOwner: {
                objectType: `${this.schemaPrefix}organization`,
                objectId: org
            },
            relation: "member",
            relatedItem: {
                objectType: `${this.schemaPrefix}user`,
                objectId: user
            }
        }),
        {
            headers: this.headers(),
        })
        return data
    }

    async ReadUsersInOrganization(org: string): Promise<any> {
        const {data} = await axios.post(`${this.endpoint}/v1/relationships/read`, 
        this.readRelationship({
            resourceType: "organization"
        }),
        {
            headers: this.headers(),
        })
        return data
    }
}