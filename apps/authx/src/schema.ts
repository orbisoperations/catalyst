import { createSchema } from 'graphql-yoga';
import { Context } from 'hono';
import status from "./status"
import {AuthzedClient, ZitadelClient} from "../../../packages/authx"

class Status {
	constructor(){}

	status() {
		return {
			health: "ok"
		}
	}
}

export default createSchema({
    typeDefs: `
    type Query {
        health: String!
        status: Status!
        validateUser(token: String!): UserValidation
        listUsersInOrganization(orgId: String!): [String!]!
    }

    type Mutation {
        addUserToOrganization(orgId: String!, userId: String!): Boolean!
    }

    type Status {
        health: String!
    }

    type UserValidation {
        valid: Boolean!
        userId: String
        orgId: String
    }
    type User {
        relation: String
        subject: AuthzedObject
        resource: AuthzedObject
    }
    type AuthzedObject {
        objectType: String
        objectId: String
    }
    `,
    resolvers: {
        Query: {
            health: () => "ok",
            status: () => status.status(),
            validateUser: (_, {token}, context: Context) => {
                console.log(_, token, context,);
                return {
                    valid: true,
                    userId: "test",
                    orgId: "org"
                }
            },
            listUsersInOrganization: async (_, {orgId}, context: Context) => {
                console.log(_, orgId, context);
                const authzedClient: AuthzedClient = context.get("authzed")
                return authzedClient.ReadUsersInOrganization(orgId)
            }
        },
        Mutation: {
           // addUserToOrganization(orgId: String!, userId: String!): Boolean!
        }
    }
})
