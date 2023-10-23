import { logger } from 'hono/logger'
import { BasicAuth, BasicAuthToken, ZitadelClient, AuthzedClient } from "../../../packages/authx";
import { createYoga, createSchema } from 'graphql-yoga'
import {Hono, Context,} from "hono";
import status from "./status"
import schema from "./schema"

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
	ZITADEL_TOKEN: string;
	ZITADEL_ENDPOINT: string;
	AUTHZED_TOKEN: string
	AUTHZED_ENDPOINT: string
}

let authzedClient: AuthzedClient | undefined =  undefined;
let zitadelClient: ZitadelClient | undefined = undefined

type ContextVariables = {
	zitadel: ZitadelClient
	authzed: AuthzedClient
	userData: {

	}
}

const app = new Hono<{Bindings: EnvBindings, Variables: ContextVariables}>()
app.use('*', logger())

app.get("/health", (c: Context) => {
	c.status(200);
	return c.body("ok")
})

app.get("/status", (c: Context) => {
	c.status(200);
	return c.json(status.status())
})

app.use('*', async (c:Context, next ) => {
	//authentication guard
	// zitadel code for token introspection here
	const zBasicAuth = await BasicAuth(c.env.ZITADEL_ENDPOINT, c.env.ZITADEL_CLIENT_ID, c.env.ZITADEL_CLIENT_SECRET)
	if (zBasicAuth == undefined) {
		c.status(500)
		return c.text("Server Error - IDP")
	}

	const zClient = new ZitadelClient(c.env.ZITADEL_ENDPOINT, zBasicAuth.access_token);
	const tokenHeader = c.req.header("Authorization")
	if (tokenHeader == undefined) {
		c.status(401)
		return c.text("Missing Authentication Credentials")
	}

	const userToken = tokenHeader!.split(" ")[1]
	const userData = await zClient.validateTokenByIntrospection(userToken)

	if (userData == undefined) {
		c.status(401)
		return c.text("Authentication Error")
	}

	await next();
})
app.use('*', async (c: Context, next) => {
	if (authzedClient === undefined) {
		authzedClient = new AuthzedClient(c.env.AUTHZED_ENDPOINT, c.env.AUTHZED_TOKEN);
	}

	c.set("authzed", authzedClient)

	await next();
});


const yoga = createYoga({
	schema: schema
})

app.use("/graphql", async (c: Context) => {
	return yoga.handle(c.req.raw as Request, c)
})

export default app;
