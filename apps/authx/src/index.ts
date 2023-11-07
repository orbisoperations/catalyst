import { createYoga, createSchema } from 'graphql-yoga';
import { Hono, Context } from 'hono';
import schema from './schema';
import { NewHonoApp, AuthzedUtils } from 'ozguard';
import { OrganizationManager } from './managers/organizations.manager';
import { GroupManager } from './managers/groups.manager';
import { UserManager } from './managers/users.manager';
import { ServiceManager } from './managers/service.manager';
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
	// other bindings
};

type ContextVarialbles = {
	// other vars
};

export type AuthzedManagers = {
	org: OrganizationManager;
	group: GroupManager;
	user: UserManager;
	service: ServiceManager;
};

const app = NewHonoApp<EnvBindings, ContextVarialbles, AuthzedManagers>({
	org: new OrganizationManager(),
	group: new GroupManager(),
	user: new UserManager(),
	service: new ServiceManager(),
});

const yoga = createYoga({
	schema: schema,
});

app.use('/graphql', async (c) => {
	return yoga.handle(c.req.raw as Request, c);
});

export default app;
