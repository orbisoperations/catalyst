import { logger } from 'hono/logger';
import { BasicAuth, BasicAuthToken, ZitadelClient } from '../../../packages/authx';
import { createYoga, createSchema } from 'graphql-yoga';
import { Hono, Context } from 'hono';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

type EnvBindings = {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;

	// Zitadel items
	ZITADEL_CLIENT_ID: string;
	ZITADEL_CLIENT_SECRET: string;
	ZITADEL_ENDPOINT: string;
	AUTHZED_TOKEN: string;
};

class Status {
	constructor() {}

	status() {
		return {
			health: 'ok',
		};
	}
}

let zitadelClient: ZitadelClient | undefined = undefined;
const gateway_url = 'https://gateway-alpha.authzed.com/v1/';

const app = new Hono<{ Bindings: EnvBindings }>();
app.use('*', logger());

const status = new Status();

app.get('/health', (c: Context) => {
	c.status(200);
	return c.body('ok');
});

app.get('/status', (c: Context) => {
	c.status(200);
	return c.json(status.status());
});

const yoga = createYoga({
	schema: createSchema({
		typeDefs: `
		type Health {
			health: String!
		}
		type AuthzedObject {
			objectType: String
			objectId: String
		}
		type OrgOwner {
			subject: AuthzedObject
			resource: AuthzedObject
			relation: String

		}
		type User {
			relation: String
			subject: AuthzedObject
			resource: AuthzedObject
		}
		type Query {
			users(orgId: String!, relation: String): [User]
		}
		`,
		resolvers: {
			Query: {
				users: async (_, { orgId, relation }, context: EnvBindings) => {
					var myHeaders = new Headers();
					console.log({ context: context.AUTHZED_TOKEN });
					myHeaders.append('Content-Type', 'application/json');
					myHeaders.append('Authorization', `Bearer ${context.AUTHZED_TOKEN}`);
					var raw = JSON.stringify({
						consistency: {
							minimizeLatency: true,
						},
						relationshipFilter: {
							resourceType: 'orbisops_tutorial/organization',
							optionalResourceId: orgId,
							optionalRelation: relation,
						},
					});
					const relationships = await fetch(gateway_url + 'relationships/read', {
						method: 'POST',
						headers: myHeaders,
						body: raw,
						redirect: 'follow',
					})
						.then((response) => response.text())
						.catch((error) => console.log('error', error));
					const res = relationships?.split('\n').slice(0, -1);
					console.log(res);
					let users = [];
					if (res) {
						users = res.map((r) => {
							const result = JSON.parse(r)?.result;
							if (result) {
								const relation = result.relationship.relation;
								const resource = result.relationship.resource;
								const subject = result.relationship.subject.object;
								console.log({ subject, relation, resource });
								return { subject, relation, resource };
							}
						});
						return users;
					}
					return [];
				},
			},
			Health: {
				health: () => 'ok',
			},
		},
	}),
});

app.use('/graphql', async (c: Context) => {
	return yoga.handle(c.req.raw as Request, c.env);
});

export default app;
