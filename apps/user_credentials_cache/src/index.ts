import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';

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

/**
 * Associate bindings declared in wrangler.toml with the TypeScript type system
 */
export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	CACHE: DurableObjectNamespace<UserCredsCache>;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

function getOrgFromRoles(
	roles: Record<string, Record<string, string>>
): string | undefined {
	const roleKeys = Object.keys(roles);
	const key = roleKeys.find(
		(key) =>
			key === "platform-admin" || key === "org-admin" || key === "org-user"
	) as "platform-admin" | "org-admin" | "org-user" | undefined;

	if (!key) return undefined;

	if (roleKeys.includes(key)) {
		const role = roles[key];
		const orgKeys = Object.keys(role);
		if (orgKeys.length > 0) {
			const org = orgKeys[0];
			return role[org].split(".")[0];
		} else {
			return undefined;
		}
	}
}

interface User {
	userId: string
	orgId: string
}
export class UserCredsCache extends DurableObject<Env> {
	async getUser(token: string) {
		let user: User | undefined = undefined
		user = await this.ctx.storage.get<User>(token)

		if (user) {
			// cleanup
			this.ctx.waitUntil(this.purge(token, user));
			return user;
		}

		// cache MISS
		user = await this.validateUser(token);
		if (user) {
			await this.ctx.storage.put(token, user);
			//cleanup
			this.ctx.waitUntil(this.purge(token, user));
			return user;
		}

		return user;
	}

	async validateUser(token: string) {
		const resp = await fetch(
			'https://orbisops.cloudflareaccess.com/cdn-cgi/access/get-identity',
			{
				method: "GET",
				headers: {
					cookie: `CF_Authorization=${token}`
				}
			}
		)

		try {
			const cfUser = (await resp.json()) as {
				email: string;
				custom: Record<string, Record<string, Record<string, string>>>;
			};
			const user: string = cfUser.email;
			const org: string | undefined = getOrgFromRoles(cfUser.custom['urn:zitadel:iam:org:project:roles']);

			console.log('verified user attribs', user, org);

			if (user && org) {
				return {
					userId: user,
					orgId: org,
				} as User;
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
	async getUser(token: string, cacheNamespace:string = "default") {
		const id = this.env.CACHE.idFromName(cacheNamespace)
		const stub = this.env.CACHE.get(id)
		return stub.getUser(token)
	}
};
