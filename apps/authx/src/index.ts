import { logger } from 'hono/logger'
import { BasicAuth, BasicAuthToken, ZitadelClient } from "../../../packages/authx";
import { createYoga, createSchema } from 'graphql-yoga'
import {Hono, Context,} from "hono";

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

type  EnvBindings = {
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
	ZITADEL_ENDPOINT: string
}

class Status {
	constructor(){}

	status() {
		return {
			health: "ok"
		}
	}
}

let zitadelClient: ZitadelClient | undefined = undefined;

const app = new Hono<{Bindings: EnvBindings}>()
app.use('*', logger())

const status = new Status()

app.get("/health", (c: Context) => {
	c.status(200);
	return c.body("ok")
})

app.get("/status", (c: Context) => {
	c.status(200);
	return c.json(status.status())
})


const yoga = createYoga({
	schema: createSchema({
		typeDefs: `
		type Query {
			health: String!
			status: Status!
		}

		type Status {
			health: String!
		}
		`,
		resolvers: {
			Query: {
				health: () => "ok",
				status: () => status.status()
			}
		}
	})
})

app.use("/graphql", async (c: Context) => {
	return yoga.handle(c.req.raw as Request, c)
})

export default app;
