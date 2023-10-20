import { createSchema } from 'graphql-yoga';
import { Context } from 'hono';
import status from "./status"

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
        enrollUser(orgId: String!, userId: String!): Boolean!
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
            validateUser: (_, {token}, context) => {
                console.log(_, token, context,);
                return {
                    valid: true,
                    userId: "test",
                    orgId: "org"
                }
            },
            enrollUser: (_, {orgId, userId}, context) => {
                console.log(_, orgId, userId, context);
            }
        }
    }
})