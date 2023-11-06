import { logger } from 'hono/logger';
import { BasicAuth, BasicAuthAPI, BasicAuthToken, ZitadelClient, AuthzedClient, IZitadelClient } from '../../../packages/authx';
import { createYoga, createSchema } from 'graphql-yoga';
import { Hono, Context } from 'hono';
import status from './status';
import schema from './schema';

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
	// Zitadel items
	ZITADEL_ORG_AUTOMATION_CLIENT_ID: string;
	ZITADEL_ORG_AUTOMATION_CLIENT_SECRET: string;
	ZITADEL_TOKEN_VALIDATION_CLIENT_ID: string;
	ZITADEL_TOKEN_VALIDATION_CLIENT_SECRET: string;
	ZITADEL_ENDPOINT: string;
	AUTHZED_TOKEN: string;
	AUTHZED_ENDPOINT: string;
};

interface ZitadelUserCheck {
	details: {
		totalResult: number;
	};
	result: {
		userId: string;
	}[];
}

let authzedClient: AuthzedClient | undefined = undefined;
let zitadelClient: IZitadelClient | undefined = undefined;

export function setDefaultZitadelClient(client: IZitadelClient) {
	zitadelClient = client;
}

type ContextVarialbles = {
	zitadel: IZitadelClient;
	authzed: AuthzedClient;
};

const app = new Hono<{ Bindings: EnvBindings; Variables: ContextVarialbles }>();
app.use('*', logger());

app.get('/health', (c: Context) => {
	c.status(200);
	return c.body('ok');
});

app.get('/status', (c: Context) => {
	c.status(200);
	return c.json(status.status());
});

/*
TODO:

Discuss w/ team if we are comforatble creating authzed/zitadel clients
at the begining of the app routes instead of as a post auth generation/addition

One benefit of keeping these separate is we could use separate creds for each purpose
*/

/*
This endpoint is specifically for registering new users via webhook from zitadel

The code flow is:
  1. generate zitadel client
  2. check against zitadel that org/user combo exist
  3. generate authzed client
  4. if exists, add to Authzed
  5. return to user

There is no further execution of the API from here and 
 */
app.get('/register/:orgId/:userId', async (c: Context) => {
	const { orgId, userId } = c.req.param();
	console.info(`registering user (${userId} in organization (${orgId}))`);
	// get zitadel client
	console.info('creating zitadel client');
	const zitadelCreds = await BasicAuth(
		c.env.ZITADEL_ENDPOINT,
		c.env.ZITADEL_ORG_AUTOMATION_CLIENT_ID,
		c.env.ZITADEL_ORG_AUTOMATION_CLIENT_SECRET
	);
	console.info('received zitadel response');
	if (zitadelCreds === undefined) {
		c.status(500);
		return c.json({
			error: 'Server Error - IDP',
		});
	}
	console.info('logged into zitadel');
	// check that user is in org
	const orgList = await fetch(`${c.env.ZITADEL_ENDPOINT}/management/v1/orgs/me/members/_search`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${zitadelCreds.access_token}`,
			'x-zitadel-orgid': orgId,
		},
		body: JSON.stringify({
			query: {
				offset: '0',
				limit: 100,
				asc: true,
			},
			queries: [
				{
					userIdQuery: {
						userId: userId,
					},
				},
			],
		}),
	});

	const orgCheckResp = await orgList.json();
	console.info('received org check response');

	if (!orgList.ok) {
		c.status(500);
		return c.json({
			error: 'Server Error - Unable to Lookup User',
		});
	}

	const zitadelUserCheck: ZitadelUserCheck = orgCheckResp as ZitadelUserCheck;
	if (zitadelUserCheck.details.totalResult != 1) {
		c.status(500);
		return c.json({
			error: 'Server Error - IDP Error - user not found',
		});
	}

	// write user to org
	console.log(`writing user(${userId}) to organization(${orgId})`);
	const writeResult = await new AuthzedClient(c.env.AUTHZED_ENDPOINT, c.env.AUTHZED_TOKEN).orgManager.addUserToOrganization(orgId, userId);

	if (writeResult.writtenAt === undefined) {
		c.status(500);
		return c.json({
			error: 'Server Error - Unable to Register User',
		});
	}

	c.status(200);
	return c.json({
		registered: true,
	});
});

// authentication guard
app.use('*', async (c: Context, next) => {
	// set zitadel client
	if (zitadelClient === undefined) {
		const zCreds = await BasicAuthAPI(
			c.env.ZITADEL_ENDPOINT,
			c.env.ZITADEL_TOKEN_VALIDATION_CLIENT_ID,
			c.env.ZITADEL_TOKEN_VALIDATION_CLIENT_SECRET
		);
		if (zCreds === undefined) {
			c.status(500);
			return c.body(JSON.stringify({ error: 'Server Error - IDP' }));
		}
		setDefaultZitadelClient(new ZitadelClient(c.env.ZITADEL_ENDPOINT, zCreds.access_token));
	}

	// get authorization header
	const authnHeader = c.req.header('Authorization');
	if (authnHeader === undefined) {
		c.status(401);
		return c.body(JSON.stringify({ error: 'Unauthorized - Missing Authn Credentials' }));
	}

	// break out token
	const token = authnHeader.split(' ')[1];

	// do check for token validity here
	const validCheck = await zitadelClient?.validateTokenByIntrospection(token, true);
	if (validCheck === undefined || validCheck.active === false) {
		c.status(401);
		return c.body(
			JSON.stringify({
				error: 'Unauthorized - Credentials Invalid',
			})
		);
	}

	c.set('zitadel', zitadelClient);
	await next();
});

// create and set authzed client in context
app.use('*', async (c: Context, next) => {
	if (authzedClient === undefined) {
		authzedClient = new AuthzedClient(c.env.AUTHZED_ENDPOINT, c.env.AuthConfig);
	}

	c.set('authzed', authzedClient);
	await next();
});

const yoga = createYoga({
	schema: schema,
});

app.use('/graphql', async (c: Context) => {
	return yoga.handle(c.req.raw as Request, c);
});

export default app;
