import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import { User } from '../../../packages/schema_zod';
import { Env } from './env';

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

type Roles = Record<string, Record<string, string>>;

type OrganizationWithRoles = {
	org: string;
	roles: string[];
};

export function getOrgFromRoles(roles: Roles): OrganizationWithRoles | undefined {
	const adminRoles = ['platform-admin', 'org-admin', 'org-user', 'data-custodian'];
	const roleKeys = Object.keys(roles);
	let rolesList = roleKeys.filter((key) => adminRoles.includes(key));
	const adminRoleKey = roleKeys.find((key) => adminRoles.includes(key));

	if (!adminRoleKey) return undefined;

	const role = roles[adminRoleKey];
	const orgKeys = Object.keys(role);

	if (orgKeys.length === 0) return undefined;

	const org = orgKeys[0];

	return {
		org: role[org].split('.')[0],
		roles: rolesList,
	};
}

export class UserCredsCache extends DurableObject<Env> {
	async getUser(token: string) {
		let user: User | undefined = undefined;
		user = await this.ctx.storage.get<User>(token);
		if (user) {
			// cleanup
			await this.ctx.waitUntil(this.purge(token, user));
			return user;
		}

		// cache MISS
		user = await this.validateUser(token);
		if (user) {
			await this.ctx.storage.put(token, user);
			//cleanup
			await this.ctx.waitUntil(this.purge(token, user));
			return user;
		}

		return user;
	}

	async validateUser(token: string) {
		const resp = await fetch('https://orbisops.cloudflareaccess.com/cdn-cgi/access/get-identity', {
			method: 'GET',
			headers: {
				cookie: `CF_Authorization=${token}`,
			},
		});

		if (!resp.ok) {
			console.error('error validating user with cloudflare-access');
			return undefined;
		}

		try {
			const cfUser = (await resp.json()) as {
				email: string;
				custom: Record<string, Record<string, Record<string, string>>>;
			};
			const user: string = cfUser.email;
			const orgFromRoles = getOrgFromRoles(cfUser.custom['urn:zitadel:iam:org:project:roles']);
			if (!orgFromRoles) return undefined;
			const { org, roles } = orgFromRoles;

			console.log('verified user attribs', user, org);

			if (user && org) {
				const parseUser = User.safeParse({
					userId: user,
					orgId: org,
					zitadelRoles: roles,
				});
				if (!parseUser.success) {
					return undefined;
				}
				return parseUser.data;
			} else {
				console.error('user or org is undefined and unable to validate user');
				return undefined;
			}
		} catch (e) {
			console.error(e);
			console.error('unable to validate user');
			return undefined;
		}
	}

	async purge(token: string, user: User) {
		const users = await this.ctx.storage.list<User>();
		for (const [oToken, oUser] of Array.from(users.entries())) {
			if (user.userId == oUser.userId && user.orgId == oUser.orgId && token != oToken) {
				// purge entries where user is the same but token is old/diff
				await this.ctx.storage.delete(oToken);
			}
		}
	}
}

export default class UserCredsCacheWorker extends WorkerEntrypoint<Env> {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.toml
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async getUser(token: string, cacheNamespace: string = 'default') {
		const id = this.env.CACHE.idFromName(cacheNamespace);
		const stub: DurableObjectStub<UserCredsCache> = this.env.CACHE.get(id);
		const user = await stub.getUser(token);
		return user;
	}
}
